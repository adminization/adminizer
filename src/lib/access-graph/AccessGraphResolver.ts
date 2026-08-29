/**
 * accessGraph — relationship-based record access over a graph of models (ReBAC).
 *
 * A graph declares a root model carrying memberships plus the models that inherit its
 * visibility down explicit parent edges (`include`). This module owns everything heavy:
 * graph compilation and validation, the recursive `targetIds → level ids → flat where`
 * walk, and per-request memoization of the intermediate id lists. `DataAccessor` only
 * dispatches into it, and does so for every model the graph covers — a covered model's
 * own `userAccessRelation` is ignored (see `RecordAccessResolver.buildWhere`).
 */
import { AccessGraphActionVerb, AccessGraphConfig, AccessGraphRootIds, AdminpanelConfig, ModelConfig } from "../../interfaces/adminpanelConfig";
import { CriteriaWhere } from "../../interfaces/queryCriteria";
import { Adminizer } from "../Adminizer";
import type { AbstractModel, GraphSubqueryLevel } from "../model/AbstractModel";
import { ModelHandler } from "../model/ModelHandler";
import { Group } from "../../models/Group";
import { User } from "../../models/User";
import { RecordAccessCache } from "./RecordAccessCache";
import {
    ResolvedMembership,
    grantsToken,
    membershipTargetIds,
    modelCrudToken,
    relationValueId,
    resolveMembership,
} from "./shared";

function normalizeName(name: string): string {
    return name.toLowerCase();
}

/** Resolved membership declared at the graph root (through-form without `field`). */
type CompiledMembership = ResolvedMembership;

interface CompiledGraph {
    key: string;
    rootResource?: string;
    rootPrimaryKey: string;
    membership?: CompiledMembership;
    bypassToken?: string;
    /** Stage 3: compile read filters into one nested-subquery SQL when the adapter can. */
    pushdown?: boolean;
    /**
     * Models whose pushdown fallback has already been logged, so the warning is emitted once
     * per model instead of once per request. It lives on the compiled graph rather than in a
     * module-level set so that recompiling (config change, model registration) reports again —
     * the answer may well have changed.
     */
    pushdownFallbacksReported?: Set<string>;
    resolveGraphRootIds?: AccessGraphConfig["resolveGraphRootIds"];
    /** Structural problem: every access to the graph's models fails closed with this message. */
    error?: string;
}

/**
 * A configured `pushdown: true` that cannot be compiled is invisible: the records returned are
 * the same, the read is just back to one query per level with every intermediate id inlined. So
 * the fallback is the one thing worth saying out loud — `warn`, not `error`, because nothing is
 * broken and access stays correct; and once per model, because it repeats on every request.
 */
function reportPushdownFallback(graph: CompiledGraph, resourceName: string, reason?: string): void {
    const reported = graph.pushdownFallbacksReported ??= new Set<string>();
    const key = normalizeName(resourceName);
    if (reported.has(key)) {
        return;
    }
    reported.add(key);
    Adminizer.log.warn(
        `[accessGraph] graph "${graph.key}": "${resourceName}" declares pushdown: true, but its read filter `
        + `cannot be compiled into a subquery — ${reason ?? "reason not reported by the adapter"}. `
        + `Falling back to per-level materialization: the records are the same, but the read costs one query `
        + `per level of the chain plus every intermediate id inlined into the final query.`
    );
}

interface CompiledNode {
    graphKey: string;
    resourceName: string;
    isRoot: boolean;
    /** Association alias on this model pointing at its parent in the graph. */
    parentAlias?: string;
    /** Canonical resource name of the edge target. */
    parentResource?: string;
    /** Stage 2: denormalized root-id column collapsing this model's read filter to one step. */
    graphRootField?: string;
    primaryKey: string;
    /** Structural problem: access to this model fails closed with this message. */
    error?: string;
}

export interface CompiledAccessGraph {
    graphs: Map<string, CompiledGraph>;
    /** Key: normalized canonical resource name. */
    nodes: Map<string, CompiledNode>;
    /** Structural errors; access to the affected models fails closed until they are fixed. */
    problems: string[];
}

/**
 * Compiled per model registry, merged-config object and model-registry version. The cache
 * is keyed by the `ModelHandler` — the one object that is never shared between Adminizer
 * instances — so two instances sharing a config object cannot read each other's compile.
 * `ConfigLayerHandler.rebuildConfig` replaces `config.accessGraph` wholesale (identity
 * mismatch), and every model (un)registration or enable/disable bumps
 * `ModelHandler.registryVersion` (version mismatch) — either way the stale compile is
 * dropped, so a model registered without any config change joins the graph too.
 */
const compiledGraphCache = new WeakMap<ModelHandler, {
    graphsConfig: object;
    version: number;
    compiled: CompiledAccessGraph;
}>();

export function compileAccessGraph(adminizer: Adminizer): CompiledAccessGraph | undefined {
    const graphsConfig = adminizer.config?.accessGraph;
    if (!graphsConfig || !Object.keys(graphsConfig).length) {
        return undefined;
    }

    const modelHandler = adminizer.modelHandler;
    const version = modelHandler.registryVersion;
    let entry = compiledGraphCache.get(modelHandler);
    if (!entry || entry.graphsConfig !== graphsConfig || entry.version !== version) {
        entry = { graphsConfig, version, compiled: buildCompiledGraph(graphsConfig, modelHandler) };
        compiledGraphCache.set(modelHandler, entry);
        Adminizer.log.warn(
            `[accessGraph] accessGraph is an EXPERIMENTAL feature and is enabled for graph(s): `
            + `${Object.keys(graphsConfig).join(", ")}. Its configuration format and access semantics `
            + `may change in a minor release. Review the resulting record visibility before relying on it in production.`
        );
        for (const problem of entry.compiled.problems) {
            Adminizer.log.error(`[accessGraph] ${problem}`);
        }
        // Two conflicting record-access rules on one model. The graph wins, so the model's
        // own declaration silently does nothing — which means the records it exposes are not
        // the ones its config describes. That is a configuration error, not a preference:
        // report it as loudly as a structural problem, even though the graph still filters
        // correctly and access does not fail open.
        for (const node of entry.compiled.nodes.values()) {
            if ((adminizer.config?.models?.[node.resourceName] as ModelConfig | undefined)?.userAccessRelation) {
                Adminizer.log.error(
                    `[accessGraph] INVALID CONFIGURATION — model "${node.resourceName}" declares ` +
                    `"userAccessRelation" AND is covered by access graph "${node.graphKey}". ` +
                    `Two record-access rules on one model must never coexist: the graph wins, the model's ` +
                    `own "userAccessRelation" is IGNORED, and the records this model exposes are therefore ` +
                    `NOT the ones its own declaration describes. Resolve this now — either remove ` +
                    `"userAccessRelation" from the "${node.resourceName}" model config (the graph already ` +
                    `confines it), or take "${node.resourceName}" out of the "${node.graphKey}" graph's ` +
                    `"include" if it must keep its own rule.`
                );
            }
        }
    }

    return entry.compiled;
}

/**
 * True when `fieldKey` on `resourceName` is exactly the edge the graph uses to reach that
 * model's parent. Records behind such an edge need no verification: a child is visible
 * only because its parent is, so the parent is inside the user's graph by construction.
 */
export function isGraphParentEdge(
    adminizer: Adminizer,
    resourceName: string,
    fieldKey: string,
    targetResourceName: string
): boolean {
    const node = compileAccessGraph(adminizer)?.nodes.get(normalizeName(resourceName));
    if (!node || node.error || node.isRoot || !node.parentResource) {
        return false;
    }

    return node.parentAlias === fieldKey
        && normalizeName(node.parentResource) === normalizeName(targetResourceName);
}

/** Startup validation: fails loud on structural graph errors. */
export function validateAccessGraph(adminizer: Adminizer): void {
    const compiled = compileAccessGraph(adminizer);
    if (compiled?.problems.length) {
        throw new Error(`Invalid accessGraph configuration:\n - ${compiled.problems.join("\n - ")}`);
    }
}

/**
 * Models the resolver queries through the internal `data-accessor` scope at request
 * time: membership models, `Group` (when narrowing by membership group), and every
 * model that is a parent of another graph model (their id lists feed the next level).
 * Roots are never queried — their ids come from the membership rows.
 */
export function collectAccessGraphInternalModels(
    graphsConfig: AdminpanelConfig["accessGraph"],
    modelHandler: ModelHandler
): string[] {
    const models: string[] = [];

    for (const graphConfig of Object.values(graphsConfig ?? {})) {
        if (!graphConfig || typeof graphConfig !== "object") {
            continue;
        }

        // Must mirror what the resolver queries at request time: `resolveMembership`
        // resolves `through` as a resource name/alias (getResourceRecord), and the
        // group narrowing always asks for the literal "Group".
        const membership = graphConfig.membership;
        if (membership?.through) {
            const throughResource = modelHandler.getResourceRecord(membership.through)?.name;
            if (throughResource) {
                models.push(throughResource);
            }
            if (membership.group) {
                models.push("Group");
            }
        }

        const rootResource = graphConfig.root
            ? modelHandler.getResourceRecord(graphConfig.root)?.name
            : undefined;
        for (const [modelName, edge] of Object.entries(graphConfig.include ?? {})) {
            const record = modelHandler.getResourceRecord(modelName);
            const attribute = edge?.parent ? record?.model.attributes?.[edge.parent] : undefined;
            const parentResource = attribute?.model
                ? modelHandler.resolveAssociationResource(attribute.model, attribute.resourceName)
                : undefined;
            if (parentResource && parentResource !== rootResource) {
                models.push(parentResource);
            }
        }
    }

    return Array.from(new Set(models));
}

function buildCompiledGraph(
    graphsConfig: NonNullable<AdminpanelConfig["accessGraph"]>,
    modelHandler: ModelHandler
): CompiledAccessGraph {
    const graphs = new Map<string, CompiledGraph>();
    const nodes = new Map<string, CompiledNode>();
    const problems: string[] = [];

    const addNode = (node: CompiledNode) => {
        const id = normalizeName(node.resourceName);
        const existing = nodes.get(id);
        if (existing) {
            existing.error =
                `Model "${node.resourceName}" belongs to more than one access graph ` +
                `("${existing.graphKey}", "${node.graphKey}")`;
            problems.push(existing.error);
            return;
        }
        nodes.set(id, node);
    };

    for (const [graphKey, graphConfig] of Object.entries(graphsConfig)) {
        if (!graphConfig || typeof graphConfig !== "object") {
            continue;
        }

        const rootRecord = graphConfig.root ? modelHandler.getResourceRecord(graphConfig.root) : undefined;
        const graph: CompiledGraph = {
            key: graphKey,
            rootResource: rootRecord?.name,
            rootPrimaryKey: (rootRecord?.model.primaryKey as string | undefined) ?? "id",
            bypassToken: graphConfig.bypassToken,
            pushdown: graphConfig.pushdown,
            resolveGraphRootIds: graphConfig.resolveGraphRootIds,
        };
        graphs.set(graphKey, graph);

        const failGraph = (message: string) => {
            graph.error = `graph "${graphKey}": ${message}`;
            problems.push(graph.error);
        };

        if (!graphConfig.root) {
            failGraph(`no root model is declared (an extend-only patch without its defining graph?)`);
        } else if (!rootRecord) {
            // The graph covers registered models, so a missing root must fail closed, not open.
            failGraph(`root model "${graphConfig.root}" is not registered`);
        } else {
            addNode({
                graphKey,
                resourceName: rootRecord.name,
                isRoot: true,
                primaryKey: graph.rootPrimaryKey,
            });
        }

        if (!graph.error) {
            if (graphConfig.membership) {
                try {
                    graph.membership = resolveGraphMembership(graphKey, graphConfig.membership, graph.rootResource!, modelHandler);
                } catch (error) {
                    graph.error = (error as Error).message;
                    problems.push(graph.error);
                }
            } else if (!graphConfig.resolveGraphRootIds) {
                failGraph(`neither "membership" nor "resolveGraphRootIds" is declared`);
            }
        }

        for (const [modelName, edge] of Object.entries(graphConfig.include ?? {})) {
            const record = modelHandler.getResourceRecord(modelName);
            if (!record) {
                // An unregistered model is unreachable through the panel, so staying
                // outside the graph is safe; registering it bumps the registry version, which
                // recompiles the graph, so the edge activates immediately.
                Adminizer.log.warn(
                    `[accessGraph] graph "${graphKey}": model "${modelName}" is not registered; ` +
                    `it stays outside the graph until it appears`
                );
                continue;
            }

            const node: CompiledNode = {
                graphKey,
                resourceName: record.name,
                isRoot: false,
                parentAlias: edge?.parent,
                primaryKey: (record.model.primaryKey as string | undefined) ?? "id",
            };
            addNode(node);
            if (nodes.get(normalizeName(record.name)) !== node) {
                continue; // duplicated across graphs — already failed closed
            }

            if (!edge?.parent) {
                node.error = `graph "${graphKey}": model "${record.name}" declares no "parent" edge`;
                problems.push(node.error);
                continue;
            }

            const attribute = record.model.attributes?.[edge.parent];
            if (!attribute?.model) {
                node.error = `graph "${graphKey}": edge "${record.name}.${edge.parent}" is not a model association`;
                problems.push(node.error);
                continue;
            }

            // Neither adapter marks an association attribute as required — the NOT NULL
            // lives on its foreign-key column, so the edge is mandatory when either says so.
            const edgeForeignKey = typeof attribute.via === "string"
                ? record.model.attributes?.[attribute.via]
                : undefined;
            if (attribute.required !== true && edgeForeignKey?.required !== true) {
                // Not an error: partial updates legitimately omit the parent. But a record
                // created without one hangs outside every graph and only administrators
                // will ever see it again, which looks like data loss from the panel.
                Adminizer.log.warn(
                    `[accessGraph] graph "${graphKey}": edge "${record.name}.${edge.parent}" is optional — ` +
                    `records saved without it stay outside the graph and are invisible to non-administrators`
                );
            }

            node.parentResource = modelHandler.resolveAssociationResource(attribute.model, attribute.resourceName);
            if (!node.parentResource) {
                // Unlike a missing include model, this one IS reachable through the panel,
                // so an unresolved parent must deny access rather than leave it outside the graph.
                node.error =
                    `graph "${graphKey}": edge "${record.name}.${edge.parent}" targets "${attribute.model}", ` +
                    `which is not registered`;
                problems.push(node.error);
            }
        }

        // Stage 2: graphRootField declarations shortcut reads but never replace the edge itself,
        // so a bad declaration is a config problem (fail loud at boot), not a denied node —
        // the chain keeps filtering.
        for (const [modelName, field] of Object.entries(graphConfig.graphRootField ?? {})) {
            const record = modelHandler.getResourceRecord(modelName);
            if (!record) {
                continue; // unregistered include model — same fail-soft as above
            }

            const node = nodes.get(normalizeName(record.name));
            if (!node || node.graphKey !== graphKey || node.isRoot) {
                problems.push(
                    `graph "${graphKey}": graphRootField declared for "${modelName}", ` +
                    `which is not an included (non-root) model of the graph`
                );
                continue;
            }
            if (!record.model.attributes?.[field]) {
                problems.push(`graph "${graphKey}": graphRootField "${record.name}.${field}" does not exist on the model`);
                continue;
            }
            node.graphRootField = field;
        }
    }

    // Every non-root node must reach its graph's root through same-graph nodes, acyclically.
    for (const node of nodes.values()) {
        if (node.isRoot || node.error) {
            continue;
        }

        const visited = new Set<string>([normalizeName(node.resourceName)]);
        let current = node;
        for (;;) {
            const parentId = normalizeName(current.parentResource!);
            const parent = nodes.get(parentId);
            if (!parent || parent.graphKey !== node.graphKey) {
                node.error =
                    `graph "${node.graphKey}": edge "${current.resourceName}.${current.parentAlias}" points at ` +
                    `"${current.parentResource}", which is not part of the graph`;
                problems.push(node.error);
                break;
            }
            if (parent.error) {
                node.error =
                    `graph "${node.graphKey}": model "${node.resourceName}" is unreachable because its ` +
                    `ancestor "${parent.resourceName}" is misconfigured`;
                problems.push(node.error);
                break;
            }
            if (parent.isRoot) {
                break;
            }
            if (visited.has(parentId)) {
                node.error = `graph "${node.graphKey}": cycle detected through "${parent.resourceName}"`;
                problems.push(node.error);
                break;
            }
            visited.add(parentId);
            current = parent;
        }
    }

    return { graphs, nodes, problems };
}

/**
 * Resolves the membership declared at the graph root against the registered models:
 * `through` must carry exactly one relation to the root model, a `via` relation to User
 * and, optionally, a `group` relation to Group. Same rules as the membership form of
 * `userAccessRelation`, just anchored at the root instead of a `field`.
 */
function resolveGraphMembership(
    graphKey: string,
    membershipConfig: NonNullable<AccessGraphConfig["membership"]>,
    rootResource: string,
    modelHandler: ModelHandler
): CompiledMembership {
    return resolveMembership(
        membershipConfig,
        rootResource,
        modelHandler,
        (message) => new Error(`graph "${graphKey}": ${message}`)
    );
}

/**
 * Short-lived resolver: one instance is held by a `DataAccessor` (model + action), so
 * its memoized intermediate id lists (key: graph + verb + token model + level) live as
 * long as the owning accessor — never longer than the request, though a request may
 * hold several accessors. Nothing is cached across requests — staleness is more
 * dangerous than the saved queries.
 */
export class AccessGraphResolver {
    /** Shared with the other resolvers of the same request when the caller supplies one. */
    private readonly cache: RecordAccessCache;

    constructor(
        private readonly adminizer: Adminizer,
        private readonly user: User,
        private readonly actionVerb: string,
        cache?: RecordAccessCache,
    ) {
        this.cache = cache ?? new RecordAccessCache();
    }

    /** Cache keys carry the user: a shared cache is per request, but never per user by construction. */
    private cacheKey(suffix: string): string {
        return `graph:${String(this.user.id)}:${suffix}`;
    }

    /** True when the compiled graph covers the model (including fail-closed misconfigured nodes). */
    static covers(adminizer: Adminizer, resourceName: string): boolean {
        return Boolean(compileAccessGraph(adminizer)?.nodes.has(normalizeName(resourceName)));
    }

    /**
     * Flat where-fragment confining the model to the records reachable from the user's
     * memberships at the root: root ids for the root model, `{parentAlias: {in: ids}}`
     * for everything below it. `{}` means no constraint (bypass or `"all"`).
     */
    async buildWhere(resourceName: string): Promise<CriteriaWhere> {
        const { node, graph } = this.requireNode(resourceName);
        if (this.hasGraphBypass(graph)) {
            return {};
        }

        // The filter attribute: root — its pk; graphRootField (stage 2) — the denormalized
        // root-id column; otherwise the parent edge.
        const attribute = node.isRoot ? node.primaryKey : (node.graphRootField ?? node.parentAlias!);

        if (graph.pushdown) {
            let declined: string | undefined;
            const operand = await this.compilePushdownOperand(
                node, graph, resourceName, (reason) => { declined ??= reason; }
            );
            if (operand === "unfiltered") {
                return {};
            }
            if (operand !== undefined) {
                return { [attribute]: { in: operand } };
            }
            // undefined — the chain cannot be pushed down; fall back to materialization
            reportPushdownFallback(graph, resourceName, declined);
        }

        const sourceIds = node.isRoot || node.graphRootField
            ? await this.visibleModelIds(graph.rootResource!, graph, resourceName)
            : await this.visibleModelIds(node.parentResource!, graph, resourceName);
        return sourceIds === "all" ? {} : { [attribute]: { in: sourceIds } };
    }

    /**
     * Stage 3: compiles the whole walk — membership subquery plus the parent chain (cut by
     * a graphRootField when one is on the path) — into one adapter-emitted subquery operand.
     * Returns `"unfiltered"` for an explicit `"all"`, or `undefined` when the chain cannot
     * be pushed down (custom-resolved ids with no chain still return a plain id array).
     */
    private async compilePushdownOperand(
        node: CompiledNode,
        graph: CompiledGraph,
        tokenModelName: string,
        decline: (reason: string) => void
    ): Promise<unknown | "unfiltered" | undefined> {
        // resolveGraphRootIds takes precedence over membership; its result is always materialized
        let seedIds: unknown[] | undefined;
        if (graph.resolveGraphRootIds) {
            const resolved = await this.customGraphRootIds(graph);
            if (resolved === "all") {
                return "unfiltered";
            }
            if (resolved !== undefined) {
                seedIds = Array.from(new Set(resolved));
            }
        }

        let membershipLevel: GraphSubqueryLevel | undefined;
        if (seedIds === undefined) {
            const membership = graph.membership;
            if (!membership) {
                // the materialized path surfaces the configuration error
                decline("the graph declares no membership to start the subquery from");
                return undefined;
            }
            const throughModel = this.adminizer.modelHandler.getResource(membership.through);
            if (!throughModel) {
                decline(`the membership model "${membership.through}" is not registered`);
                return undefined;
            }
            const conditions: NonNullable<GraphSubqueryLevel["conditions"]> = [
                { attribute: membership.viaAlias, values: [this.user.id] },
            ];
            if (membership.groupAlias) {
                conditions.push({
                    attribute: membership.groupAlias,
                    values: await this.allGroupIdsGrantingAction(tokenModelName),
                });
            }
            membershipLevel = { model: throughModel, select: membership.targetAlias, conditions };
        }

        // Parent chain from the source down to the filtered attribute's target level;
        // empty for the root and for graphRootField models (their filter reads root ids directly).
        const compiled = compileAccessGraph(this.adminizer)!;
        const chain: CompiledNode[] = [];
        if (!node.isRoot && !node.graphRootField) {
            let current = compiled.nodes.get(normalizeName(node.parentResource!))!;
            for (;;) {
                chain.unshift(current);
                if (current.isRoot || current.graphRootField) {
                    break;
                }
                current = compiled.nodes.get(normalizeName(current.parentResource!))!;
            }
        }

        const levels: GraphSubqueryLevel[] = [];
        let innerIsSubquery = false;
        if (membershipLevel) {
            levels.push(membershipLevel);
            innerIsSubquery = true;
        }
        for (let i = 0; i < chain.length; i++) {
            const levelNode = chain[i];
            if (levelNode.isRoot) {
                continue; // its ids ARE the inner source (membership subquery or seed ids)
            }
            const levelModel = this.adminizer.modelHandler.getResource(levelNode.resourceName);
            if (!levelModel) {
                decline(`the chain passes through "${levelNode.resourceName}", which is not registered`);
                return undefined;
            }
            const linkAttribute = i === 0 && levelNode.graphRootField ? levelNode.graphRootField : levelNode.parentAlias!;
            const level: GraphSubqueryLevel = { model: levelModel, select: levelNode.primaryKey };
            if (innerIsSubquery) {
                level.parentAttribute = linkAttribute;
            } else {
                level.conditions = [{ attribute: linkAttribute, values: seedIds! }];
            }
            levels.push(level);
            innerIsSubquery = true;
        }

        if (!levels.length) {
            // Custom-resolved ids with nothing between them and the filter — plain IN list.
            return seedIds;
        }

        const accessedModel: AbstractModel<unknown> | undefined =
            this.adminizer.modelHandler.getResource(node.resourceName);
        if (!accessedModel?.compileGraphInSubquery) {
            decline(`the adapter serving "${node.resourceName}" implements no pushdown`);
            return undefined;
        }
        return accessedModel.compileGraphInSubquery(levels, decline);
    }

    /**
     * Write path: the chosen parent must be reachable for this action's verb (with a
     * membership `group` declared, through a group carrying the action's CRUD token).
     */
    async validateWriteRelation<T>(resourceName: string, record: T): Promise<void> {
        const { node, graph } = this.requireNode(resourceName);
        if (node.isRoot) {
            return;
        }
        if (this.hasGraphBypass(graph)) {
            return;
        }

        const data = record as Record<string, unknown>;

        if (node.parentAlias) {
            const value = data[node.parentAlias];
            if (value !== undefined && value !== null) {
                const parentIds = await this.visibleModelIds(node.parentResource!, graph, resourceName);
                if (parentIds !== "all") {
                    const parentNode = this.requireNode(node.parentResource!).node;
                    const chosenId = relationValueId(value, parentNode.primaryKey);
                    if (!parentIds.some((id) => String(id) === String(chosenId))) {
                        throw new Error(`Access denied: "${node.parentAlias}" does not belong to the current user`);
                    }
                }
            }
        }

        // graphRootField is an ordinary writable column and the read filter trusts it,
        // so a forged value would surface the record in another graph — it must
        // stay within the root ids reachable for this action's verb.
        if (node.graphRootField) {
            const value = data[node.graphRootField];
            if (value !== undefined && value !== null) {
                const rootIds = await this.visibleModelIds(graph.rootResource!, graph, resourceName);
                if (rootIds !== "all") {
                    const chosenId = relationValueId(value, graph.rootPrimaryKey);
                    if (!rootIds.some((id) => String(id) === String(chosenId))) {
                        throw new Error(`Access denied: "${node.graphRootField}" does not belong to the current user`);
                    }
                }
            }
        }
    }

    private requireNode(resourceName: string): { node: CompiledNode; graph: CompiledGraph } {
        const compiled = compileAccessGraph(this.adminizer);
        const node = compiled?.nodes.get(normalizeName(resourceName));
        if (!node) {
            throw new Error(`Model "${resourceName}" is not covered by accessGraph`);
        }

        const graph = compiled!.graphs.get(node.graphKey);
        if (!graph) {
            throw new Error(`access graph "${node.graphKey}" was not compiled`);
        }
        // The graph-level problem is the root cause; node errors are often its fallout.
        if (graph.error) {
            throw new Error(graph.error);
        }
        if (node.error) {
            throw new Error(node.error);
        }

        return { node, graph };
    }

    /** Ids of the model's records visible to the user, or `"all"`; memoized per level. */
    private visibleModelIds(resourceName: string, graph: CompiledGraph, tokenModelName: string): Promise<unknown[] | "all"> {
        const memoKey = this.cacheKey(
            `${graph.key}:${this.actionVerb}:${normalizeName(tokenModelName)}:${normalizeName(resourceName)}`
        );
        return this.cache.resolve(memoKey, () => this.computeVisibleModelIds(resourceName, graph, tokenModelName));
    }

    private async computeVisibleModelIds(
        resourceName: string,
        graph: CompiledGraph,
        tokenModelName: string
    ): Promise<unknown[] | "all"> {
        const { node } = this.requireNode(resourceName);
        if (node.isRoot) {
            return this.resolveGraphRootIds(graph, tokenModelName);
        }

        // Stage 2: the denormalized root-id column collapses this level to one step.
        const sourceIds = node.graphRootField
            ? await this.visibleModelIds(graph.rootResource!, graph, tokenModelName)
            : await this.visibleModelIds(node.parentResource!, graph, tokenModelName);
        if (sourceIds === "all") {
            return "all";
        }

        const rows: Record<string, unknown>[] = await this.internalModel(node.resourceName)
            .find({ where: { [node.graphRootField ?? node.parentAlias!]: { in: sourceIds } } }) ?? [];
        return Array.from(new Set(
            rows
                .map((row) => row[node.primaryKey])
                .filter((id) => id !== null && id !== undefined)
        ));
    }

    /**
     * Root ids the user reaches: `resolveGraphRootIds` when declared (undefined falls back),
     * otherwise the membership rows — narrowed, when `group` is declared, to memberships
     * whose group carries this action's CRUD token for the model being accessed.
     */
    private async resolveGraphRootIds(graph: CompiledGraph, tokenModelName: string): Promise<unknown[] | "all"> {
        if (graph.resolveGraphRootIds) {
            const resolved = await this.customGraphRootIds(graph);
            if (resolved === "all") {
                return "all";
            }
            if (resolved !== undefined) {
                return Array.from(new Set(resolved));
            }
        }

        const membership = graph.membership;
        if (!membership) {
            throw new Error(
                `access graph "${graph.key}": resolveGraphRootIds returned undefined and no membership is declared`
            );
        }

        return membershipTargetIds(
            (resourceName) => this.internalModel(resourceName),
            membership,
            this.user.id,
            graph.rootPrimaryKey,
            modelCrudToken(this.actionVerb, tokenModelName)
        );
    }

    /** `resolveGraphRootIds` may be side-effectful; call it at most once per graph per request. */
    private customGraphRootIds(graph: CompiledGraph): Promise<AccessGraphRootIds> {
        return this.cache.resolve(
            this.cacheKey(`custom-graph-ids:${graph.key}:${this.actionVerb}`),
            async () => graph.resolveGraphRootIds!(this.user, this.actionVerb as AccessGraphActionVerb)
        );
    }

    /**
     * Pushdown variant of the group narrowing: ids of every group granting this action's
     * CRUD token for the accessed model, computed in JS (token grants are JSON) and
     * injected into the membership subquery as a literal IN-list. The group table is a
     * small set of role definitions, so fetching it whole is cheaper than a round trip
     * for the membership rows the JS path would need.
     */
    private async allGroupIdsGrantingAction(tokenModelName: string): Promise<unknown[]> {
        const tokenId = modelCrudToken(this.actionVerb, tokenModelName);
        return this.cache.resolve(this.cacheKey(`granting-groups:${tokenId}`), async () => {
            const groups = await this.internalModel<Group>("Group").find({});
            return (groups ?? [])
                .filter((group) => grantsToken(group.tokens ?? [], tokenId))
                .map((group) => group.id as unknown);
        });
    }

    /** The bypass token is matched against the token grants of the user's global groups. */
    private hasGraphBypass(graph: CompiledGraph): boolean {
        if (!graph.bypassToken) {
            return false;
        }

        const tokenId = graph.bypassToken.toLowerCase();
        return (this.user.groups ?? []).some((group: Group) => grantsToken(group.tokens ?? [], tokenId));
    }

    private internalModel<T = any>(resourceName: string) {
        return this.adminizer.modelHandler.internal("data-accessor").get<T>(resourceName);
    }
}
