/**
 * Record-level access for models declaring `userAccessRelation` — builds the read
 * filter (`buildWhere`) and applies the write rules (`applyWriteRules`) for its three
 * forms: string (own User/Group column), `{field, via}` (intermediate model) and
 * `{field, through, via[, group]}` (membership). The accessGraph wins over all three:
 * a model it covers is filtered by the graph and its own relation is ignored.
 * One instance is held per `DataAccessor` (model + action), so the memoization here
 * and in the embedded `AccessGraphResolver` lives as long as the owning accessor —
 * never longer than the request, though a request may hold several accessors.
 */
import { ModelResource } from "../../interfaces/types";
import { CriteriaWhere } from "../../interfaces/queryCriteria";
import { Adminizer } from "../Adminizer";
import { Group } from "../../models/Group";
import { User } from "../../models/User";
import type { AbstractModel } from "../model/AbstractModel";
import { AccessGraphResolver } from "./AccessGraphResolver";
import { RecordAccessCache } from "./RecordAccessCache";
import {
    ResolvedMembership,
    grantsToken,
    membershipTargetIds,
    modelCrudToken,
    ownershipTransferToken,
    relationValueId,
    resolveMembership,
} from "./shared";

type UserAccessRelationObject = { field: string; via?: string; through?: string; group?: string };

export class RecordAccessResolver {
    private accessGraphResolver?: AccessGraphResolver;
    // The resolver is fixed to one user/model/verb, so single keyless lazy caches
    // suffice: a write both validates and re-filters, which would otherwise resolve
    // the declaration and query the membership rows twice. A rejection stays cached
    // for the resolver's lifetime — same as the AccessGraphResolver memo.
    private resolvedMembershipMemo?: ResolvedMembership & { targetPrimaryKey: string };
    private membershipTargetIdsMemo?: Promise<unknown[]>;

    constructor(
        private readonly adminizer: Adminizer,
        private readonly user: User,
        private readonly modelResource: ModelResource,
        private readonly actionVerb: string,
        private readonly cache: RecordAccessCache = new RecordAccessCache(),
    ) {}

    /**
     * Where-fragment confining the model to the current user's records;
     * `{}` means no constraint (administrators, models without record access rules).
     */
    async buildWhere(): Promise<CriteriaWhere> {
        if (this.user.isAdministrator) {
            return {};
        }

        if (AccessGraphResolver.covers(this.adminizer, this.modelResource.name)) {
            // The graph wins over the model's own `userAccessRelation`, which is ignored
            // for as long as a graph covers the model (a warning is logged when the graph
            // compiles). Letting a node opt out would break the premise `isGraphParentEdge`
            // rests on — a node is visible only because its graph parent is, which is why
            // the populate verification of that edge may be skipped. An opted-out node
            // stays reachable by its own rule while the premise no longer holds, and the
            // parent record leaks through the association.
            return this.getAccessGraphResolver().buildWhere(this.modelResource.name);
        }

        const userAccessRelation = this.userAccessRelation();
        if (userAccessRelation) {
            Adminizer.log.debug(
                `[userAccessRelation] Model "${this.modelResource.name}" is record-restricted: ` +
                `user "${this.user.login}" (id: ${this.user.id}) only sees records they own.`
            );
            if (typeof userAccessRelation === "string") {
                return this.buildStringFormWhere(userAccessRelation);
            }
            if (userAccessRelation.through) {
                // Membership form: filter by the targets the user has a membership row for
                const membership = this.resolveMembershipDeclaration(userAccessRelation);
                const targetIds = await this.findMembershipTargetIds(membership);
                return { [userAccessRelation.field]: { in: targetIds } };
            }
            return this.buildViaFormWhere(userAccessRelation);
        }

        return {};
    }

    /**
     * Write rules for the outgoing record: stamp the access column (string form,
     * creation only) or validate that the chosen relation belongs to the user.
     * Applied on create and update alike — an update may not move a record into
     * a graph or membership target the user cannot reach.
     */
    async applyWriteRules<T>(record: T): Promise<Partial<T>> {
        const updatedRecord: Partial<T> = { ...record };

        if (!this.user.isAdministrator && AccessGraphResolver.covers(this.adminizer, this.modelResource.name)) {
            // Same precedence as the read filter: the graph wins, so the model's own write
            // rules (including the string form's owner stamping) do not run for a graph node.
            await this.getAccessGraphResolver().validateWriteRelation(this.modelResource.name, updatedRecord);
            return updatedRecord;
        }

        const userAccessRelation = this.userAccessRelation();
        if (userAccessRelation) {
            if (typeof userAccessRelation === "string") {
                this.applyStringFormWrite(updatedRecord, userAccessRelation);
            } else if (userAccessRelation.through) {
                await this.validateMembershipWrite(updatedRecord, userAccessRelation);
            } else {
                await this.validateViaWrite(updatedRecord, userAccessRelation);
            }
        }

        return updatedRecord;
    }

    private userAccessRelation(): string | UserAccessRelationObject | undefined {
        const value = this.modelResource.config?.userAccessRelation;
        if (typeof value === "string" || (typeof value === "object" && value !== null)) {
            return value as string | UserAccessRelationObject;
        }
        return undefined;
    }

    private buildStringFormWhere(accessField: string): CriteriaWhere {
        const modelName = this.modelResource.name;
        const relation = this.modelResource.model!.attributes[accessField];
        const relationModel = this.resolveRelationTarget(relation?.model, relation?.resourceName);
        const relationCollection = this.resolveRelationTarget(relation?.collection, relation?.resourceName);

        if (!relation || !["User", "Group"].includes(relationModel ?? relationCollection ?? "")) {
            throw new Error(`Invalid userAccessRelation configuration for model ${modelName}`);
        }

        if (relationModel === "User") {
            return { [accessField]: this.user.id };
        }
        if (relationModel === "Group") {
            // Absent groups must fail closed: an empty IN list matches nothing, while
            // `in: undefined` would be dropped by the adapter and widen the query.
            return { [accessField]: { in: this.userGroupIds() } };
        }

        /** Warning: collection relation access is not supported and needs adapter-level processing */
        Adminizer.log.warn(`Collection relation is not supported and was not tested. You may have an error here: ${JSON.stringify(relation, null, 2)}`);
        if (relationCollection === "User") {
            // Ensure user's ID is part of the associated collection to User
            return { [accessField]: { contains: this.user.id } };
        }
        // Ensure user's groups intersect with the collection to Group
        return { [accessField]: { intersects: this.userGroupIds() } };
    }

    private async buildViaFormWhere({ field, via }: UserAccessRelationObject): Promise<CriteriaWhere> {
        const { intermediateRelation, intermediatePk } = this.resolveViaDeclaration(field, via);

        // Fetch all intermediate records associated with the user
        const intermediateRecords = await this.accessRelationModel(
            intermediateRelation.model!,
            intermediateRelation.resourceName
        ).find({ where: { [via!]: this.user.id } });
        const intermediateIds = (intermediateRecords || []).map((r: Record<string, unknown>) => r[intermediatePk]);
        return { [field]: { in: intermediateIds } };
    }

    /**
     * String form: only an administrator — or a holder of the model's ownership-transfer
     * token — may set the access column explicitly. For everyone else it is stamped from
     * the current user at creation; an update never re-stamps, so a record cannot change
     * owner through the panel.
     */
    private applyStringFormWrite<T>(updatedRecord: Partial<T>, accessField: string): void {
        const mayTransfer = this.mayTransferOwnership();
        if (updatedRecord[accessField as keyof T] !== undefined && !mayTransfer) {
            delete updatedRecord[accessField as keyof T];
        }

        const relation = this.modelResource.model!.attributes[accessField];
        const relationModel = this.resolveRelationTarget(relation?.model, relation?.resourceName);
        if (!relation || !["User", "Group"].includes(relationModel ?? "")) {
            return;
        }

        if (mayTransfer || this.actionVerb !== "create") {
            // The access column is never stamped for these callers. Leaving it empty is
            // legal but produces a record no restricted user will ever see again.
            if (this.actionVerb === "create" && updatedRecord[accessField as keyof T] === undefined) {
                Adminizer.log.warn(
                    `[userAccessRelation] Model "${this.modelResource.name}" is created without "${accessField}": ` +
                    `the record stays out of reach and will be visible to administrators only`
                );
            }
            return;
        }

        if (relationModel === "User") {
            updatedRecord[accessField as keyof T] = this.user.id as T[keyof T];
            return;
        }

        const userGroups = (this.user.groups as Group[]) || [];
        if (userGroups.length === 1) {
            updatedRecord[accessField as keyof T] = userGroups[0].id as T[keyof T];
        } else {
            throw new Error("Record cannot be saved because the user is associated with none or multiple groups.");
        }
    }

    /**
     * Membership form: the chosen target must be one the user has a membership row
     * for (with `group` declared, one whose group carries this action's CRUD token).
     */
    private async validateMembershipWrite<T>(
        updatedRecord: Partial<T>,
        userAccessRelation: UserAccessRelationObject
    ): Promise<void> {
        const { field } = userAccessRelation;
        const value = updatedRecord[field as keyof T];
        if (value === undefined || value === null || this.mayTransferOwnership()) {
            return;
        }

        const membership = this.resolveMembershipDeclaration(userAccessRelation);
        const targetIds = await this.findMembershipTargetIds(membership);
        const chosenId = relationValueId(value, membership.targetPrimaryKey);
        if (!targetIds.some((id) => String(id) === String(chosenId))) {
            throw new Error(`Access denied: "${field}" does not belong to the current user`);
        }
    }

    /** Via form: the chosen intermediate record must belong to the user. */
    private async validateViaWrite<T>(
        updatedRecord: Partial<T>,
        { field, via }: UserAccessRelationObject
    ): Promise<void> {
        const value = updatedRecord[field as keyof T];
        if (value === undefined || value === null || this.mayTransferOwnership()) {
            return;
        }

        const { intermediateRelation, intermediatePk } = this.resolveViaDeclaration(field, via);
        const chosenId = relationValueId(value, intermediatePk);
        const record = await this.accessRelationModel(
            intermediateRelation.model!,
            intermediateRelation.resourceName
        ).findOne({ where: { [intermediatePk]: chosenId, [via!]: this.user.id } });
        if (!record) {
            throw new Error(`Access denied: "${field}" does not belong to the current user`);
        }
    }

    /**
     * Structural resolution of the `{field, via}` form, shared by the read filter
     * and the write validation so the two paths cannot diverge.
     */
    private resolveViaDeclaration(field: string, via?: string) {
        if (!via) {
            throw new Error(`Invalid userAccessRelation configuration: "via" is required`);
        }

        const intermediateRelation = this.modelResource.model!.attributes[field];
        if (!intermediateRelation || !intermediateRelation.model) {
            throw new Error(`Invalid intermediate relation configuration for field "${field}" in model ${this.modelResource.name}`);
        }

        const intermediateModel = this.getRelationModel(intermediateRelation.model, intermediateRelation.resourceName);
        if (!intermediateModel) {
            throw new Error(`Intermediate model "${intermediateRelation.model}" not found`);
        }

        const viaRelation = intermediateModel.attributes[via];
        if (!viaRelation || this.resolveRelationTarget(viaRelation.model, viaRelation.resourceName) !== "User") {
            throw new Error(
                `Unsupported or invalid via field "${via}" in intermediate model "${intermediateRelation.model}". ` +
                `Currently, only relations to "User" are supported`
            );
        }

        return {
            intermediateRelation,
            intermediateModel,
            intermediatePk: (intermediateModel.primaryKey ?? "id") as string,
        };
    }

    /**
     * Resolves the membership (`through`) form: `field` must point at the target
     * model; the rest of the declaration is resolved by the shared routine.
     */
    private resolveMembershipDeclaration(
        userAccessRelation: UserAccessRelationObject
    ): ResolvedMembership & { targetPrimaryKey: string } {
        return this.resolvedMembershipMemo ??= this.computeMembershipDeclaration(userAccessRelation);
    }

    private computeMembershipDeclaration(
        userAccessRelation: UserAccessRelationObject
    ): ResolvedMembership & { targetPrimaryKey: string } {
        const modelName = this.modelResource.name;
        const { field } = userAccessRelation;

        const targetRelation = this.modelResource.model!.attributes[field];
        if (!targetRelation || !targetRelation.model) {
            throw new Error(`Invalid intermediate relation configuration for field "${field}" in model ${modelName}`);
        }
        const targetResource = this.resolveRelationTarget(targetRelation.model, targetRelation.resourceName);
        if (!targetResource) {
            throw new Error(`Relation model "${targetRelation.model}" was not found`);
        }

        const membership = resolveMembership(
            userAccessRelation,
            targetResource,
            this.adminizer.modelHandler,
            (message) => new Error(message.charAt(0).toUpperCase() + message.slice(1))
        );

        return {
            ...membership,
            targetPrimaryKey: (this.getRelationModel(targetRelation.model, targetRelation.resourceName)?.primaryKey ?? "id") as string,
        };
    }

    /**
     * Target ids the current user reaches through membership rows; with a `group`
     * declared, only memberships whose group carries this action's CRUD token count.
     */
    private findMembershipTargetIds(membership: ResolvedMembership & { targetPrimaryKey: string }): Promise<unknown[]> {
        const key = `membership:${String(this.user.id)}:${this.modelResource.name}:${this.actionVerb}:${membership.through}`;
        return this.membershipTargetIdsMemo ??= this.cache.resolve(key, () => membershipTargetIds(
            (resourceName) => this.adminizer.modelHandler.internal("data-accessor").get(resourceName),
            membership,
            this.user.id,
            membership.targetPrimaryKey,
            modelCrudToken(this.actionVerb, this.modelResource.name)
        ));
    }

    /**
     * Administrators, plus holders of the model's ownership-transfer token: they may point
     * a record at a target of their choosing instead of the one they belong to. The token is
     * registered only for models declaring `userAccessRelation` and granted to nobody by
     * default, so out of the box this is administrators only.
     */
    private mayTransferOwnership(): boolean {
        if (this.user.isAdministrator) {
            return true;
        }

        // Matched against the group grants directly, like the graph's `bypassToken`:
        // `hasStaticPermission` answers "yes" to everything once `auth.enable` is false,
        // which would drop the write rules for every user of an unauthenticated panel.
        const tokenId = ownershipTransferToken(this.modelResource.name);
        return (this.user.groups ?? []).some((group: Group) => grantsToken(group.tokens ?? [], tokenId));
    }

    private userGroupIds(): unknown[] {
        return this.user.groups?.map((group: Group) => group.id) ?? [];
    }

    private resolveRelationTarget(modelName?: string, resourceName?: string): string | undefined {
        if (!modelName) {
            return undefined;
        }

        return this.adminizer.modelHandler.resolveAssociationResource(modelName, resourceName);
    }

    private getRelationModel<T = any>(modelName: string, resourceName?: string) {
        const resolvedResourceName = this.resolveRelationTarget(modelName, resourceName);
        return resolvedResourceName
            ? this.adminizer.modelHandler.getResource(resolvedResourceName) as AbstractModel<T> | undefined
            : undefined;
    }

    private accessRelationModel<T = any>(modelName: string, resourceName?: string) {
        const resolvedResourceName = this.resolveRelationTarget(modelName, resourceName);
        if (!resolvedResourceName) {
            throw new Error(`Relation model "${modelName}" was not found`);
        }

        return this.adminizer.modelHandler.internal("data-accessor").get<T>(resolvedResourceName);
    }

    private getAccessGraphResolver(): AccessGraphResolver {
        this.accessGraphResolver ??= new AccessGraphResolver(this.adminizer, this.user, this.actionVerb, this.cache);
        return this.accessGraphResolver;
    }
}
