import type {User} from '../../models/User';
import type {Adminizer} from '../Adminizer';
import type {
    AbstractDocumentation,
    DocContent,
    DocMeta,
    DocSearchQuery,
    DocSearchResult,
} from './AbstractDocumentation';

export const DOCUMENTATION_BASE_TOKEN = 'read-documentation';
export const DOCUMENTATION_DEPARTMENT = 'documentation';

/** Contextual table of contents handed to the UI as a shared Inertia prop. */
export interface DocContextSummary {
    count: number;
    items: Array<{id: string; title: string; section?: string}>;
}

/**
 * The adminizer-side facade of the documentation subsystem: holds the single
 * active `AbstractDocumentation` implementation and applies access rights to
 * every result before it can reach the UI, the HTTP API or the assistant.
 *
 * Implementations know nothing about users; a document a user may not read
 * simply does not exist for them — it is absent from listings, search results,
 * the keyword map and link resolution.
 *
 * Per-document rights are declarative: the document author references an
 * existing access token in the metadata (a model token like `read-Test-model`
 * via `models`, or any custom token via `accessRightsToken`). The subsystem
 * never creates tokens from documents — a referenced token that nobody
 * registered simply keeps the document admin-only.
 */
export class DocumentationHandler {
    private service?: AbstractDocumentation;
    private owner?: string;
    private bound = false;

    /**
     * `bind` is the wiring Adminizer installs (token, navigation, skills, HTTP
     * routes); it runs at most once, the moment the feature has both of its
     * switches: `config.documentation.enabled` and a registered implementation.
     */
    constructor(private readonly adminizer: Adminizer, private readonly bind?: () => void) {}

    /** Base access token; without it the whole subsystem is invisible. */
    public get baseToken(): string {
        return DOCUMENTATION_BASE_TOKEN;
    }

    public get enabled(): boolean {
        return this.adminizer.config.documentation?.enabled === true && Boolean(this.service);
    }

    public isRegistered(): boolean {
        return Boolean(this.service);
    }

    /**
     * Activates the singleton implementation. Registering a second one is an
     * error: replacing the active service must be an explicit `unregister`
     * followed by a new `register`.
     *
     * With `config.documentation.enabled` set, the first registration also
     * brings the subsystem up — token, navigation, skills and HTTP routes.
     * None of it exists before that, so a missing implementation is
     * indistinguishable from a disabled feature.
     */
    public register(service: AbstractDocumentation, owner = 'host'): void {
        if (this.service) {
            throw new Error(`Documentation service is already registered by "${this.owner}"`);
        }
        service.adminizer = this.adminizer;
        this.service = service;
        this.owner = owner;
        this.activate();
    }

    /**
     * Runs the installed wiring once both switches of the feature hold. Called
     * from `register()` and again from `Adminizer.init` — that second call
     * covers a service registered before the config was read. Re-registering
     * after an `unregister` reuses the wiring instead of mounting it twice.
     */
    public activate(): void {
        if (this.bound || !this.bind || !this.service) return;
        if (this.adminizer.config?.documentation?.enabled !== true) return;
        this.bound = true;
        this.bind();
    }

    public unregister(owner?: string): boolean {
        if (!this.service || (owner && this.owner !== owner)) return false;
        this.service = undefined;
        this.owner = undefined;
        return true;
    }

    /** The locale documentation is served in when the consumer names none. */
    public localeFor(user?: User): string | undefined {
        if (user?.locale) return user.locale;
        const translation = this.adminizer.config.translation;
        return typeof translation === 'object' && translation ? translation.defaultLocale : undefined;
    }

    /** Metadata of every document this user may read. */
    public async list(user: User, locale?: string): Promise<DocMeta[]> {
        const service = this.requireService();
        return this.permitted(user, await service.list(locale));
    }

    /** One document, or `undefined` when it does not exist for this user. */
    public async get(user: User, id: string, locale?: string): Promise<DocContent | undefined> {
        const service = this.requireService();
        const content = await service.get(id, locale);
        if (!content || !(await this.allowed(user, content.meta))) return undefined;
        return content;
    }

    public async search(user: User, query: DocSearchQuery, locale?: string): Promise<DocSearchResult[]> {
        const service = this.requireService();
        const results = await service.search(query, locale);
        const filtered: DocSearchResult[] = [];
        for (const result of results) {
            if (await this.allowed(user, result.meta)) filtered.push(result);
        }
        return filtered;
    }

    /** Whether the subsystem is up and this user may read documentation at all. */
    public async canRead(user?: User): Promise<boolean> {
        if (!this.enabled || !user) return false;
        return Boolean(await this.adminizer.accessRightsHelper.hasPermission(this.baseToken, user));
    }

    /**
     * The contextual table of contents of an admin page: metadata only, and
     * `null` when the subsystem is off or the user may not read documentation.
     * Shared with every page as a prop, so it never throws.
     */
    public async forContextMeta(user: User, url: string, locale?: string): Promise<DocContextSummary | null> {
        if (!(await this.canRead(user))) return null;
        const documents = await this.forContext(user, {url}, locale ?? this.localeFor(user));
        return {
            count: documents.length,
            items: documents.map((meta) => ({id: meta.id, title: meta.title, section: meta.section})),
        };
    }

    /** Documents bound to a place in the admin panel this user may read. */
    public async forContext(user: User, ctx: {url?: string; model?: string}, locale?: string): Promise<DocMeta[]> {
        const service = this.requireService();
        return this.permitted(user, await service.forContext(ctx, locale));
    }

    /**
     * Keyword → document ids over accessible documents only: keywords of a
     * hidden document never reach the map, empty keywords are dropped.
     */
    public async keywords(user: User, locale?: string): Promise<Map<string, string[]>> {
        const service = this.requireService();
        const visible = new Set((await this.list(user, locale)).map((meta) => meta.id));
        const map = new Map<string, string[]>();
        for (const [keyword, ids] of await service.keywords(locale)) {
            const permitted = ids.filter((id) => visible.has(id));
            if (permitted.length > 0) map.set(keyword, permitted);
        }
        return map;
    }

    /** Resolves an in-document reference; a target this user may not read stays unresolved. */
    public async resolveLink(user: User, fromId: string, ref: string): Promise<string | undefined> {
        const service = this.requireService();
        const target = await service.resolveLink(fromId, ref);
        if (!target) return undefined;
        const metas = await service.list();
        const meta = metas.find((candidate) => candidate.id === target);
        if (!meta || !(await this.allowed(user, meta))) return undefined;
        return target;
    }

    private requireService(): AbstractDocumentation {
        if (!this.service) throw new Error('No documentation service is registered');
        return this.service;
    }

    private async permitted(user: User, metas: DocMeta[]): Promise<DocMeta[]> {
        const filtered: DocMeta[] = [];
        for (const meta of metas) {
            if (await this.allowed(user, meta)) filtered.push(meta);
        }
        return filtered;
    }

    /**
     * The access decision of the subsystem: the base token, then the per-doc
     * token, then — for model-bound documents — read access to at least one of
     * the models, with the same token DataAccessor gates the data itself.
     */
    private async allowed(user: User, meta: DocMeta): Promise<boolean> {
        const has = (token: string) => this.adminizer.accessRightsHelper.hasPermission(token, user);
        if (!(await has(this.baseToken))) return false;
        if (meta.accessRightsToken && !(await has(meta.accessRightsToken))) return false;
        if (meta.models.length > 0) {
            for (const model of meta.models) {
                if (await has(`read-${model}-model`)) return true;
            }
            return false;
        }
        return true;
    }
}
