import {listAccessibleMenuItems} from '../../helpers/navigationAccessHelper';
import type {User} from '../../models/User';
import type {Adminizer} from '../Adminizer';
import type {AdminLinkTemplateParam} from '../admin-links/AdminLinkHandler';

export interface AiAssistantAdminLink {
    id: string;
    title: string;
    /** Concrete page, ready for `navigate`. Absent for templates. */
    link?: string;
    /** Parametrized page: pass `template` plus `params` to `navigate`. */
    template?: string;
    /** Placeholders that must be filled to open a template. */
    params?: AdminLinkTemplateParam[];
    description?: string;
    section?: string;
}

/**
 * A browser capability an AI service may expose as a tool.  The agent emits
 * `ui.method` with this id; the assistant panel performs the browser action.
 */
export interface AiAssistantUiMethod {
    id: string;
    title: string;
    description: string;
    /** JSON Schema consumed by tool-capable model services. */
    inputSchema: Record<string, unknown>;
    /** Built-in browser executor understood by the shared assistant panel. */
    action: 'navigate' | 'search-admin-links' | string;
    accessRightsToken?: string;
}

/** What the agent may ask to open: a concrete link or a template plus values. */
export interface AiAssistantNavigationTarget {
    href?: string;
    template?: string;
    params?: Record<string, unknown>;
}

export class AiAssistantUiMethodHandler {
    private readonly methods = new Map<string, AiAssistantUiMethod>();
    private readonly owners = new Map<string, string>();

    constructor(private readonly adminizer: Adminizer) {
        this.register({
            id: 'navigate',
            title: 'Open admin section',
            description: 'Open an Adminizer page in the current browser tab using the Inertia router.'
                + ' Pass `href` for a concrete link, or `template` plus `params` for a parametrized page'
                + ' such as a single record. Both come from search-admin-links.',
            inputSchema: {
                type: 'object',
                properties: {
                    href: {type: 'string', description: 'Adminizer-relative URL of a concrete page to open.'},
                    template: {type: 'string', description: 'Id of a link template returned by search-admin-links.'},
                    params: {
                        type: 'object',
                        description: 'Values for the template placeholders, e.g. {"id": "3860d321-…"}.',
                        additionalProperties: {type: 'string'},
                    },
                },
                additionalProperties: false,
            },
            action: 'navigate',
        });
        this.register({
            id: 'search-admin-links',
            title: 'Search admin sections and links',
            description: 'Search the current user\'s accessible Adminizer navigation sections, links and'
                + ' link templates (record pages, catalog items and other parametrized pages).',
            inputSchema: {
                type: 'object',
                properties: {query: {type: 'string', description: 'Words to search in section, link and template titles.'}},
                required: ['query'], additionalProperties: false,
            },
            action: 'search-admin-links',
        });
    }

    register(method: AiAssistantUiMethod, owner?: string): void {
        const id = method.id.trim().toLowerCase();
        if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error(`Invalid AI assistant UI method id: ${method.id}`);
        if (!method.title.trim() || !method.description.trim()) throw new Error(`AI assistant UI method "${id}" requires title and description`);
        this.methods.set(id, {...method, id});
        if (owner) this.owners.set(id, owner); else this.owners.delete(id);
    }

    unregister(id: string, owner?: string): void {
        const normalized = id.trim().toLowerCase();
        if (owner && this.owners.get(normalized) !== owner) return;
        this.methods.delete(normalized);
        this.owners.delete(normalized);
    }

    async getAvailable(user: User): Promise<AiAssistantUiMethod[]> {
        const available: AiAssistantUiMethod[] = [];
        for (const method of this.methods.values()) {
            if (method.accessRightsToken
                && !await this.adminizer.accessRightsHelper.checkPermission(method.accessRightsToken, user)) {
                continue;
            }
            available.push({...method, inputSchema: {...method.inputSchema}});
        }
        return available;
    }

    /**
     * Search exactly the navigation a user can open.  This intentionally uses
     * MenuHelper rather than client-side markup, therefore a tool result is
     * permission-safe and works when the assistant panel is not visible.
     *
     * Parametrized pages are returned as templates, so a record page is
     * reachable even though its URL only exists once the id is known.
     */
    async searchAdminLinks(user: User, query = ''): Promise<AiAssistantAdminLink[]> {
        const needle = this.slug(query);
        const result: AiAssistantAdminLink[] = [];
        const matches = (...values: Array<string | undefined>): boolean =>
            !needle || this.slug(values.filter(Boolean).join(' ')).includes(needle);

        const add = (item: any, section?: string): void => {
            if (!item?.link || !item?.title) return;
            const link: AiAssistantAdminLink = {
                id: String(item.id || item.title), title: String(item.title), link: String(item.link),
                section: item.section || section,
            };
            // A link with placeholders is surfaced as a template instead.
            if (!/:[A-Za-z0-9_]+/.test(link.link!) && matches(link.title, link.id, link.section)) result.push(link);
            for (const child of item.actions ?? item.subItems ?? []) add(child, link.section);
        };

        // Exactly the menu the sidebar renders for this user, sub-items included.
        for (const item of await listAccessibleMenuItems(this.adminizer, user)) add(item, item.section);

        for (const template of await this.adminizer.adminLinkHandler.listTemplates(user)) {
            if (!matches(template.title, template.id, template.section, template.description, template.template)) continue;
            result.push({
                id: template.id,
                title: template.title,
                template: template.template,
                params: template.params,
                description: template.description,
                section: template.section,
                // A template without placeholders is already a usable link.
                link: template.params.length ? undefined : template.template,
            });
        }
        return result;
    }

    /**
     * Validates what an agent asked to open and returns the concrete admin URL.
     * Templates are resolved against this user's own permissions, so the LLM
     * can only reach pages that user could reach by clicking.
     */
    async resolveNavigation(user: User, target: AiAssistantNavigationTarget): Promise<string> {
        const template = target.template?.trim();
        if (template) {
            return this.adminizer.adminLinkHandler.resolveTemplate(user, template, target.params ?? {});
        }

        const href = target.href?.trim();
        if (!href) throw new Error('Navigation requires either href or template');
        const prefix = (this.adminizer.config.routePrefix || '').replace(/\/+$/, '');
        if (href !== prefix && !href.startsWith(`${prefix}/`)) {
            throw new Error('Only Adminizer-relative links may be opened.');
        }
        if (/:[A-Za-z0-9_]+/.test(href)) {
            throw new Error('This link is a template: pass it as `template` together with `params`.');
        }
        if (this.adminizer.adminLinkHandler.isDestructivePath(href)) {
            throw new Error('This page changes data and cannot be opened by the assistant.');
        }
        return href;
    }

    private slug(value: string): string {
        return String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
    }
}
