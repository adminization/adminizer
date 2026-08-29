import type {User} from '../../models/User';
import type {Adminizer} from '../Adminizer';

export interface AdminLink {
    id: string;
    type: string;
    name: string;
    link: string;
    title?: string;
    section?: string;
    accessRightsToken?: string;
}

export interface ResolvedAdminLink extends AdminLink {
    owner: string;
    title: string;
}

/** A placeholder of an admin link template, e.g. `id` in `/model/Test/edit/:id`. */
export interface AdminLinkTemplateParam {
    name: string;
    description?: string;
}

/**
 * A parametrized admin page, e.g. `/admin/model/Test/edit/:id`. Templates are
 * what makes a record page reachable: the concrete URL only exists once the
 * caller knows the record id.
 */
export interface AdminLinkTemplate {
    id: string;
    title: string;
    /** Absolute admin path with `:param` placeholders. */
    template: string;
    description?: string;
    section?: string;
    accessRightsToken?: string;
    /** Placeholder descriptions; placeholders absent here are still required. */
    params?: AdminLinkTemplateParam[];
}

export interface ResolvedAdminLinkTemplate extends AdminLinkTemplate {
    owner: string;
    params: AdminLinkTemplateParam[];
}

/** Segments no template may point at: opening one mutates data. */
const DESTRUCTIVE_PATH = /\/model\/[^/]+\/remove(\/|$)/i;

/** Server-side registry of standalone admin pages contributed by applications. */
export class AdminLinkHandler {
    private readonly links = new Map<string, ResolvedAdminLink>();
    private readonly templates = new Map<string, ResolvedAdminLinkTemplate>();

    constructor(private readonly adminizer: Adminizer) {}

    add(link: AdminLink, owner = 'host'): string {
        const type = link.type.trim();
        const name = link.name.trim();
        const href = link.link.trim();
        if (!type || !name || !href) throw new Error('Admin link requires type, name and link');
        if (!href.startsWith('/')) throw new Error(`Admin link "${name}" must use an absolute admin path`);
        const id = `${this.slug(type)}:${this.slug(name)}`;
        if (this.links.has(id)) throw new Error(`Admin link "${id}" is already registered`);
        this.links.set(id, {
            ...link, id, type, name, link: href, owner,
            title: link.title?.trim() || name,
            section: link.section?.trim() || undefined,
        });
        return id;
    }

    remove(id: string, owner?: string): boolean {
        const link = this.links.get(id);
        if (!link || (owner && link.owner !== owner)) return false;
        return this.links.delete(id);
    }

    async list(user: User, type?: string): Promise<ResolvedAdminLink[]> {
        const wanted = type ? this.slug(type) : null;
        const accessible: ResolvedAdminLink[] = [];
        for (const link of this.links.values()) {
            if (wanted && this.slug(link.type) !== wanted) continue;
            if (link.accessRightsToken && !await this.adminizer.accessRightsHelper.checkPermission(link.accessRightsToken, user)) continue;
            accessible.push(link);
        }
        return accessible;
    }

    async resolve(user: User, type: string, name: string): Promise<ResolvedAdminLink | undefined> {
        const wanted = this.slug(name);
        return (await this.list(user, type))
            .find((link) => this.slug(link.name) === wanted || this.slug(link.title) === wanted);
    }

    addTemplate(template: AdminLinkTemplate, owner = 'host'): string {
        const id = template.id.trim();
        const title = template.title.trim();
        const path = template.template.trim();
        if (!id || !title || !path) throw new Error('Admin link template requires id, title and template');
        if (!path.startsWith('/')) throw new Error(`Admin link template "${id}" must use an absolute admin path`);
        if (this.templates.has(id)) throw new Error(`Admin link template "${id}" is already registered`);
        this.templates.set(id, {
            ...template, id, title, template: path, owner,
            description: template.description?.trim() || undefined,
            section: template.section?.trim() || undefined,
            params: this.describeParams(path, template.params),
        });
        return id;
    }

    removeTemplate(id: string, owner?: string): boolean {
        const template = this.templates.get(id);
        if (!template || (owner && template.owner !== owner)) return false;
        return this.templates.delete(id);
    }

    /**
     * Every parametrized page this user may open: model record pages, catalog
     * items, templates registered by apps and any navigation link that carries
     * placeholders of its own.
     */
    async listTemplates(user: User): Promise<ResolvedAdminLinkTemplate[]> {
        const templates: ResolvedAdminLinkTemplate[] = [];
        const push = async (template: ResolvedAdminLinkTemplate): Promise<void> => {
            if (DESTRUCTIVE_PATH.test(template.template)) return;
            if (template.accessRightsToken && !await this.adminizer.accessRightsHelper.checkPermission(template.accessRightsToken, user)) return;
            if (templates.some((existing) => existing.template === template.template || existing.id === template.id)) return;
            templates.push(template);
        };

        for (const template of this.builtinTemplates(user)) await push(template);
        for (const template of this.templates.values()) await push(template);
        return templates;
    }

    /**
     * Turns a template id (or its title) plus placeholder values into a real
     * admin URL, rejecting templates this user may not open.
     */
    async resolveTemplate(user: User, id: string, params: Record<string, unknown> = {}): Promise<string> {
        const wanted = this.slug(id);
        const available = await this.listTemplates(user);
        const template = available.find((candidate) => this.slug(candidate.id) === wanted)
            ?? available.find((candidate) => this.slug(candidate.title) === wanted || this.slug(candidate.template) === wanted);
        if (!template) throw new Error(`Admin link template "${id}" is not available`);
        return this.buildHref(template, params);
    }

    /** Fills the placeholders of a template with url-encoded values. */
    buildHref(template: ResolvedAdminLinkTemplate, params: Record<string, unknown> = {}): string {
        return template.template.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
            const value = params[name];
            if (value === undefined || value === null || value === '') {
                throw new Error(`Admin link template "${template.id}" requires the "${name}" parameter`);
            }
            return encodeURIComponent(String(value));
        });
    }

    /** True for paths that change data and therefore must never be navigated to. */
    isDestructivePath(path: string): boolean {
        return DESTRUCTIVE_PATH.test(path);
    }

    /** Templates derived from the current configuration, catalogs and navigation. */
    private builtinTemplates(user: User): ResolvedAdminLinkTemplate[] {
        const prefix = (this.adminizer.config.routePrefix || '').replace(/\/+$/, '');
        const templates: ResolvedAdminLinkTemplate[] = [];
        const builtin = (
            id: string,
            title: string,
            path: string,
            accessRightsToken: string,
            description: string,
            section?: string,
            params: AdminLinkTemplateParam[] = [],
        ): void => {
            templates.push({
                id, title, template: path, accessRightsToken, description, section, owner: 'host',
                params: this.describeParams(path, params),
            });
        };
        const recordId: AdminLinkTemplateParam[] = [
            {name: 'id', description: 'Identifier of the record, as returned when reading its data.'},
        ];

        for (const [model, config] of Object.entries(this.adminizer.config.models ?? {})) {
            const title = typeof config === 'object' && config?.title ? config.title : model;
            const section = typeof config === 'object' ? config?.navbar?.section : undefined;
            builtin(
                `model-${model}-edit`, `${title}: open record`,
                `${prefix}/model/${model}/edit/:id`, `update-${model}-model`,
                `Open the edit page of a single ${title} record by its id.`, section, recordId,
            );
            builtin(
                `model-${model}-add`, `${title}: create record`,
                `${prefix}/model/${model}/add`, `create-${model}-model`,
                `Open the create form of ${title}.`, section,
            );
        }

        for (const catalog of this.adminizer.catalogHandler.getAll()) {
            if (!catalog?.slug) continue;
            builtin(
                `catalog-${catalog.slug}-item`, `${catalog.name || catalog.slug}: open item`,
                `${prefix}/catalog/${catalog.slug}/:id`, `catalog-${catalog.slug}`,
                `Open a single item of the ${catalog.name || catalog.slug} catalog by its id.`,
                undefined, recordId,
            );
        }

        // Navigation links may carry placeholders themselves (app pages, custom
        // tools). Such a link cannot be opened as-is, so it is a template.
        const fromNavigation = (item: any, section?: string): void => {
            const path = typeof item?.link === 'string' ? item.link : '';
            if (path.startsWith('/') && /:[A-Za-z0-9_]+/.test(path) && item.title) {
                templates.push({
                    id: `link-${this.slug(String(item.id || item.title))}`,
                    title: String(item.title),
                    template: path,
                    section: item.section || section,
                    accessRightsToken: item.accessRightsToken || undefined,
                    owner: 'host',
                    params: this.describeParams(path),
                });
            }
            for (const child of item?.actions ?? item?.subItems ?? []) fromNavigation(child, item?.section || section);
        };
        for (const item of this.adminizer.menuHelper.getMenuItems(user)) fromNavigation(item, item.section);
        for (const link of this.links.values()) fromNavigation(link, link.section);

        return templates;
    }

    private describeParams(path: string, described: AdminLinkTemplateParam[] = []): AdminLinkTemplateParam[] {
        const names = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
        return [...new Set(names)].map((name) => ({
            name,
            description: described.find((param) => param.name === name)?.description,
        }));
    }

    private slug(value: string): string {
        return String(value).trim().toLowerCase().replace(/[\s_-]+/g, '-');
    }
}
