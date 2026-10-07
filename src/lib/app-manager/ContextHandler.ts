import {Adminizer} from "../Adminizer";
import type {HrefConfig, ModelConfig, NavbarSectionConfig} from "../../interfaces/adminpanelConfig";
import type {User} from "../../models/User";
import type {MenuItem} from "../../helpers/menuHelper";
import type {AppController, AppControllerMethod, AppControllerPolicy} from "./AdminizerApp";
import {filterAccessibleHrefItems, listAccessibleMenuItems, resolveMenuBadge} from "../../helpers/navigationAccessHelper";
import {requirePermission} from "../../policies/authPolicies";

export const DEFAULT_ADMIN_CONTEXT_ID = "default";
const CONTEXT_COOKIE = "adminizer_context";

/**
 * Shell of a context.
 * - `inherit` — the layout of the default context (the stock one for the
 *   default context itself);
 * - `stock` — the stock sidebar + header, without any override;
 * - `none` — no shell at all, the page fills the window;
 * - `{module}` — URL of an ES module whose named exports ({@link ShellSlotName})
 *   replace parts of the inherited layout; each receives the replaced part as
 *   `Default`. The `Layout` export replaces the whole layout. `base: "stock"`
 *   applies the module over the stock layout instead of the inherited one.
 *
 * Kept for compatibility: `default` is `stock`, `bare` is `none`,
 * `{overrides}` is `{module}`, and `{component}` is a module whose default
 * export is the whole layout, applied over the stock layout.
 */
export type AdminContextLayout =
    | "inherit"
    | "stock"
    | "none"
    | { module: string; stylesheet?: string; base?: "inherit" | "stock" }
    | "default"
    | "bare"
    | { overrides: string; stylesheet?: string }
    | { component: string; stylesheet?: string };

/** Parts of the stock layout a context may override; `Layout` is the whole of it. */
export type ShellSlotName =
    | "Layout"
    | "Sidebar"
    | "SidebarHeader"
    | "SidebarContent"
    | "SidebarFooter"
    | "Header"
    | "HeaderStart"
    | "HeaderActions";

export interface AdminContextNavbar {
    /** Items of the context's own menu; `page()` and `menuItem()` append to them. */
    items?: HrefConfig[];
    sections?: Record<string, NavbarSectionConfig>;
}

/**
 * A layout context: a part of the panel living under its own URL prefix
 * with its own navbar and, optionally, its own layout.
 */
export interface AdminContext {
    id: string;
    title: string;
    icon?: string;
    /** Path below `routePrefix`, e.g. `/support`. Every URL under it belongs to the context. */
    prefix: string;
    /** Where the switcher leads; defaults to the prefix itself. A path below `routePrefix`. */
    home?: string;
    /** @default "inherit" */
    layout?: AdminContextLayout;
    /**
     * `inherit` shows the menu of the default context. Left out, the menu is
     * inherited as well until `page()` or `menuItem()` adds an item to it.
     */
    navbar?: "inherit" | AdminContextNavbar;
    /**
     * Users lacking the token neither see the context in the switcher nor get
     * its shell, and may not open the pages declared to belong to it.
     */
    accessRightsToken?: string;
    /** Show in the context switcher. @default true */
    switcher?: boolean;
}

/** What may be changed about the built-in context mounted at `routePrefix`. */
export type DefaultAdminContextOptions = Partial<Pick<AdminContext, "title" | "icon" | "layout" | "navbar" | "switcher" | "home">>;

/** A page of a context: a route under its prefix, a menu item and breadcrumbs in one call. */
export interface AdminContextPage<Component = string> {
    /** Unique within the context; also the id of the menu item. */
    id: string;
    /** Path below the context prefix; `""` is the prefix itself. */
    path: string;
    title: string;
    icon?: string;
    /** ES module whose default export renders the page; it receives `props`. */
    component?: Component;
    /** Props of `component`: values, or a function computing them per request. */
    props?: Record<string, unknown> | ((req: ReqType) => Record<string, unknown> | Promise<Record<string, unknown>>);
    /** A handler of its own instead of `component`. */
    middleware?: MiddlewareType;
    /** @default "get" */
    method?: AppControllerMethod;
    /** @default `auth`. The context token is checked for every page of the context anyway. */
    policies?: AppControllerPolicy[];
    /** Add a menu item. @default true, false when the context's navbar is `"inherit"` */
    menu?: boolean;
    section?: string;
    badge?: HrefConfig["badge"];
    accessRightsToken?: string;
}

/** A route under the context prefix without a menu item, e.g. an API of the context. */
export interface AdminContextController extends Omit<AppController, "route" | "policies" | "context"> {
    /** Path below the context prefix. */
    path: string;
    /** @default `auth`. The context token is checked anyway. */
    policies?: AppControllerPolicy[];
}

/** A registered context: adds pages, routes and menu items to it. */
export interface AdminContextScope<Component = string> {
    readonly id: string;
    /** Registers a page under the context prefix and returns its menu item. */
    page(page: AdminContextPage<Component>): HrefConfig;
    /** Registers a route under the context prefix and returns its full path. */
    controller(controller: AdminContextController): string;
    /** Appends an item to the context's own menu. */
    menuItem(item: HrefConfig): void;
}

/** How a scope registers what its pages need: the host's handlers or an app's setup context. */
export interface AdminContextRegistrar<Component = string> {
    controller(controller: AppController): string;
    /** Turns a page component into the URL of its module. */
    component(component: Component): string;
}

interface ContextRecord extends AdminContext {
    owner: string;
}

interface ContextAssignment {
    contextId: string;
    owner: string;
    matcher: RegExp;
    specificity: number;
}

/** Context description as the browser receives it. */
export interface AdminContextProps {
    id: string;
    title: string;
    icon: string | null;
    /** Full URL prefix of the context, `routePrefix` included. */
    prefix: string;
    link: string;
    layout: AdminContextLayoutProps;
}

/** A module of the layout chain. */
export interface AdminContextLayerProps {
    /** URL of the ES module; its named exports are slot overrides. */
    module: string;
    /** `Layout`: the default export is the whole layout (`{component}`). */
    default?: "Layout";
}

/**
 * Resolved layout: the layers applied in order over the root, the default
 * context's ones first.
 */
export interface AdminContextLayoutProps {
    /** What the layers are applied over: the stock shell or nothing at all. */
    root: "stock" | "none";
    layers: AdminContextLayerProps[];
    stylesheets: string[];
}

/** Registry of layout contexts contributed by the host and by apps. */
export class ContextHandler {
    private readonly contexts = new Map<string, ContextRecord>();
    private readonly assignments = new Set<ContextAssignment>();
    private readonly reportedMissing = new Set<string>();
    private defaultOptions: DefaultAdminContextOptions = {};

    constructor(private readonly adminizer: Adminizer) {}

    /**
     * Registers a context. The returned scope adds pages to it; they are
     * registered as `owner`'s controllers.
     */
    register(context: AdminContext, owner = "host"): AdminContextScope {
        const id = context.id?.trim();
        if (!id || !context.title) throw new Error("Admin context requires id and title");
        if (id === DEFAULT_ADMIN_CONTEXT_ID) throw new Error(`Admin context id "${id}" is reserved; use configureDefault()`);
        if (this.contexts.has(id)) throw new Error(`Admin context "${id}" is already registered`);
        const prefix = this.normalizePrefix(context.prefix);
        if (!prefix) throw new Error(`Admin context "${id}" requires a non-empty prefix`);
        for (const other of this.contexts.values()) {
            if (other.prefix === prefix) throw new Error(`Admin context prefix "${prefix}" is already used by "${other.id}"`);
        }
        // Own copy: page() and menuItem() append to the items.
        const navbar = typeof context.navbar === "object"
            ? {...context.navbar, items: [...(context.navbar.items ?? [])]}
            : context.navbar;
        this.contexts.set(id, {...context, id, prefix, navbar, owner});
        this.adminizer.emitter.emit("app:context:registered", {appName: owner, resourceId: `${owner}:${id}`, id, prefix});
        return this.scope(id, {
            controller: (controller) => this.adminizer.controllerHandler.register(owner, controller),
            component: (url) => url,
        });
    }

    unregister(id: string, owner?: string): void {
        const record = this.contexts.get(id);
        if (!record || (owner && record.owner !== owner)) return;
        this.contexts.delete(id);
        this.adminizer.emitter.emit("app:context:unregistered", {appName: record.owner, resourceId: `${record.owner}:${id}`, id});
    }

    /** A scope adding pages to a registered context through the given registrar. */
    scope<Component>(id: string, registrar: AdminContextRegistrar<Component>): AdminContextScope<Component> {
        return {
            id,
            page: (page) => this.addPage(id, page, registrar),
            controller: (controller) => this.addController(id, controller, registrar),
            menuItem: (item) => this.addMenuItem(id, item),
        };
    }

    /** Overrides title, icon, layout or navbar of the built-in context. */
    configureDefault(options: DefaultAdminContextOptions): void {
        this.defaultOptions = {...this.defaultOptions, ...options};
    }

    getDefault(): AdminContext {
        return {
            title: this.adminizer.menuHelper.getBrandTitle(),
            ...this.defaultOptions,
            id: DEFAULT_ADMIN_CONTEXT_ID,
            prefix: "",
        };
    }

    get(id: string): AdminContext | undefined {
        return id === DEFAULT_ADMIN_CONTEXT_ID ? this.getDefault() : this.contexts.get(id);
    }

    list(): AdminContext[] {
        return [this.getDefault(), ...this.contexts.values()];
    }

    /** Contexts this user may enter, the default one first. */
    async listAccessible(user: User): Promise<AdminContext[]> {
        const accessible: AdminContext[] = [];
        for (const context of this.list()) {
            if (await this.isAccessible(context, user)) accessible.push(context);
        }
        return accessible;
    }

    /**
     * Declares that the pages at `path` (below `routePrefix`, `:params`
     * allowed) belong to a context: they render in it wherever the user came
     * from, and only users who may enter the context may open them. Covers
     * everything below `path` too unless `exact`. Returns a function removing
     * the declaration.
     */
    assign(path: string, contextId: string, options: { owner?: string; exact?: boolean } = {}): () => void {
        const relative = this.normalizePrefix(path);
        const assignment: ContextAssignment = {
            contextId,
            owner: options.owner ?? "host",
            matcher: this.compilePattern(`${this.root()}${relative}`, options.exact ?? false),
            specificity: this.specificity(relative),
        };
        this.assignments.add(assignment);
        return () => {
            this.assignments.delete(assignment);
        };
    }

    /**
     * The context the page at `url` is declared to belong to: by `assign()`,
     * a controller's `context` or a model's `context`. The most specific
     * declaration wins. Login, logout, registration and the first-user setup
     * never belong to a context.
     */
    declaredFor(url: string): string | undefined {
        const path = this.normalizePath(url);
        if (this.isAuthPath(path)) return undefined;
        let best: { contextId: string; specificity: number } | undefined;
        for (const assignment of this.assignments) {
            if (assignment.matcher.test(path) && (!best || assignment.specificity > best.specificity)) best = assignment;
        }
        const model = this.modelDeclaration(path);
        if (model && (!best || model.specificity > best.specificity)) best = model;
        return best?.contextId;
    }

    /** True when the page at `url` belongs to a context this user may not enter. */
    async isBlocked(url: string, user: User | undefined): Promise<boolean> {
        const contextId = this.declaredFor(url);
        if (contextId === undefined) return false;
        const context = this.get(contextId);
        if (!context) return true;
        if (!this.adminizer.config.auth?.enable || !context.accessRightsToken) return false;
        return !user || !await this.isAccessible(context, user);
    }

    /**
     * Blocks the pages declared to belong to a context the user may not
     * enter, before any handler and for every method: not logged in — the
     * login page (401 for API calls), no context token — 403, a context that
     * is not registered (a typo, a disabled app) — 404. Pages without a
     * declaration pass untouched.
     */
    guard(): MiddlewareType {
        return (req, res, next) => {
            const path = this.requestPath(req);
            const contextId = this.declaredFor(path);
            if (contextId === undefined) return next();
            const context = this.get(contextId);
            const mode = this.isPageRequest(req) ? "ui" : "api";
            if (!context) {
                if (!this.reportedMissing.has(contextId)) {
                    this.reportedMissing.add(contextId);
                    Adminizer.log.error(`Layout context "${contextId}" is declared for ${path} but not registered; its pages answer 404`);
                }
                if (mode === "ui") return res.sendStatus(404);
                return res.status(404).json({error: req.i18n?.__("Not found") || "Not found"});
            }
            if (!context.accessRightsToken) return next();
            return requirePermission(context.accessRightsToken, {mode})(req, res, next);
        };
    }

    /**
     * The context a request belongs to.
     *
     * A page declared to belong to a context renders in it. A URL under a
     * context prefix belongs to that context. Any other URL (the built-in
     * `/model/...` pages, for one) stays in the context the user came from —
     * remembered in a cookie — as long as that context's navbar links to it;
     * otherwise it falls back to the default context.
     */
    async resolve(req: ReqType): Promise<AdminContext> {
        const path = this.requestPath(req);
        const user = req.user;

        const declared = this.declaredFor(path);
        if (declared !== undefined) {
            // A declared context the user may not enter never renders: guard() answers first.
            const context = this.get(declared);
            return context && user && await this.isAccessible(context, user) ? context : this.getDefault();
        }

        let byPrefix: ContextRecord | undefined;
        for (const context of this.contexts.values()) {
            const full = this.fullPrefix(context);
            if ((path === full || path.startsWith(`${full}/`)) && (!byPrefix || context.prefix.length > byPrefix.prefix.length)) {
                byPrefix = context;
            }
        }
        if (byPrefix) {
            return user && await this.isAccessible(byPrefix, user) ? byPrefix : this.getDefault();
        }

        const remembered = this.contexts.get(this.readCookie(req) ?? "");
        if (remembered && user && typeof remembered.navbar === "object"
            && await this.isAccessible(remembered, user) && this.claims(remembered.navbar.items ?? [], path)) {
            return remembered;
        }
        return this.getDefault();
    }

    /** Remembers the context of a page visit; see {@link resolve}. */
    remember(req: ReqType, res: ResType, context: AdminContext): void {
        if (req.method !== "GET" || (this.readCookie(req) ?? DEFAULT_ADMIN_CONTEXT_ID) === context.id) return;
        res.cookie(CONTEXT_COOKIE, context.id, {path: this.root() || "/", sameSite: "lax", httpOnly: true});
    }

    /** The untranslated menu of a context for this user. */
    async listMenuItems(context: AdminContext, user: User): Promise<MenuItem[]> {
        if (!context.navbar || context.navbar === "inherit") {
            return context.id === DEFAULT_ADMIN_CONTEXT_ID
                ? listAccessibleMenuItems(this.adminizer, user)
                : this.listMenuItems(this.getDefault(), user);
        }
        const menu: MenuItem[] = [];
        for (const item of context.navbar.items ?? []) {
            if (await this.isBlocked(item.link, user)) continue;
            const actions = await filterAccessibleHrefItems(this.adminizer, user, item.subItems ?? []);
            const tokens = actions.map((action) => action.accessRightsToken).filter(Boolean) as string[];
            if (item.accessRightsToken) tokens.push(item.accessRightsToken);
            if (!await this.adminizer.accessRightsHelper.checkAnyPermission(tokens, user)) continue;
            menu.push({
                id: item.id || item.title.replace(" ", "_"),
                link: item.link,
                title: item.title,
                type: item.type,
                actions: item.subItems ? actions : null,
                icon: item.icon || null,
                accessRightsToken: item.accessRightsToken || null,
                section: item.section || context.title,
                badge: await resolveMenuBadge(user, item.badge, item.id),
            });
        }
        return menu;
    }

    getSections(context: AdminContext): Record<string, NavbarSectionConfig> {
        if (typeof context.navbar === "object") return {...(context.navbar.sections ?? {})};
        return context.id === DEFAULT_ADMIN_CONTEXT_ID
            ? this.adminizer.menuHelper.getSections()
            : this.getSections(this.getDefault());
    }

    /**
     * The layout of a context with inheritance from the default context
     * applied. Layers always add up along the chain: a module over a parent
     * keeps the parent's layers, whatever they replace.
     */
    resolveLayout(context: AdminContext): AdminContextLayoutProps {
        const stock: AdminContextLayoutProps = {root: "stock", layers: [], stylesheets: []};
        const parent = context.id === DEFAULT_ADMIN_CONTEXT_ID ? stock : this.resolveLayout(this.getDefault());
        const layout = context.layout ?? "inherit";
        if (layout === "inherit") return parent;
        if (layout === "stock" || layout === "default") return stock;
        if (layout === "none" || layout === "bare") return {root: "none", layers: [], stylesheets: []};
        if ("component" in layout) {
            // A whole layout of its own: nothing of the parent is drawn, as before.
            return {
                root: "stock",
                layers: [{module: layout.component, default: "Layout"}],
                stylesheets: layout.stylesheet ? [layout.stylesheet] : [],
            };
        }
        const module = "module" in layout ? layout.module : layout.overrides;
        const base = "module" in layout && layout.base === "stock" ? stock : parent;
        return {
            root: base.root,
            layers: [...base.layers, {module}],
            stylesheets: layout.stylesheet ? [...base.stylesheets, layout.stylesheet] : base.stylesheets,
        };
    }

    toProps(context: AdminContext): AdminContextProps {
        return {
            id: context.id,
            title: context.title,
            icon: context.icon ?? null,
            prefix: this.fullPrefix(context),
            link: `${this.root()}${context.home ? this.normalizePrefix(context.home) : context.prefix}` || "/",
            layout: this.resolveLayout(context),
        };
    }

    private addPage<Component>(id: string, page: AdminContextPage<Component>, registrar: AdminContextRegistrar<Component>): HrefConfig {
        const record = this.require(id);
        if (!page.id || !page.title) throw new Error(`A page of admin context "${id}" requires id and title`);
        if ((page.component === undefined) === (page.middleware === undefined)) {
            throw new Error(`Page "${page.id}" of admin context "${id}" requires either component or middleware`);
        }
        const menu = page.menu ?? record.navbar !== "inherit";
        const moduleComponent = page.component === undefined ? undefined : registrar.component(page.component);
        const link = this.addController(id, {
            id: `context:${id}:page:${page.id}`,
            method: page.method ?? "get",
            path: page.path,
            policies: page.policies,
            middleware: page.middleware ?? this.renderPage(id, page, moduleComponent!),
        }, registrar);
        const item: HrefConfig = {id: page.id, title: page.title, link, type: "self"};
        if (page.icon) item.icon = page.icon as HrefConfig["icon"];
        if (page.section) item.section = page.section;
        if (page.badge !== undefined) item.badge = page.badge;
        if (page.accessRightsToken) item.accessRightsToken = page.accessRightsToken;
        if (menu) this.addMenuItem(id, item);
        return item;
    }

    private addController<Component>(id: string, controller: AdminContextController, registrar: AdminContextRegistrar<Component>): string {
        const record = this.require(id);
        const {path, policies, ...rest} = controller;
        return registrar.controller({
            ...rest,
            route: `${record.prefix}${this.normalizePrefix(path)}`,
            policies: policies ?? [{type: "auth", mode: controller.method === "get" ? "ui" : "api"}],
            context: id,
        });
    }

    private addMenuItem(id: string, item: HrefConfig): void {
        const record = this.require(id);
        if (record.navbar === "inherit") {
            throw new Error(`Admin context "${id}" inherits its navbar; give it a navbar of its own to add "${item.id}"`);
        }
        record.navbar ??= {items: []};
        (record.navbar.items ??= []).push(item);
    }

    /** Renders a `component` page: the module page with context breadcrumbs. */
    private renderPage(id: string, page: AdminContextPage<unknown>, moduleComponent: string): MiddlewareType {
        return async (req) => {
            const context = this.require(id);
            const props = typeof page.props === "function" ? await page.props(req) : page.props ?? {};
            const contextTitle = req.i18n.__(context.title);
            const title = req.i18n.__(page.title);
            return req.Inertia.render({
                component: "module",
                props: {
                    moduleComponent,
                    title: `${title} · ${contextTitle}`,
                    breadcrumbs: [{title: contextTitle, href: this.fullPrefix(context)}, {title}],
                    ...props,
                },
            });
        };
    }

    private require(id: string): ContextRecord {
        const record = this.contexts.get(id);
        if (!record) throw new Error(`Admin context "${id}" is not registered`);
        return record;
    }

    private async isAccessible(context: AdminContext, user: User): Promise<boolean> {
        return !context.accessRightsToken
            || await this.adminizer.accessRightsHelper.checkPermission(context.accessRightsToken, user);
    }

    private claims(items: HrefConfig[], path: string): boolean {
        return items.some((item) => {
            const link = typeof item.link === "string" ? item.link.split(/[?#]/)[0].replace(/\/+$/, "") : "";
            return (link.startsWith("/") && (path === link || path.startsWith(`${link}/`)))
                || this.claims(item.subItems ?? [], path);
        });
    }

    /** A model page `/model/<name>/...` of a model whose config declares a context. */
    private modelDeclaration(path: string): { contextId: string; specificity: number } | undefined {
        const prefix = `${this.root()}/model/`;
        if (!path.startsWith(prefix)) return undefined;
        let name: string;
        try {
            name = decodeURIComponent(path.slice(prefix.length).split("/")[0]);
        } catch {
            return undefined;
        }
        const contextId = name ? this.findModelConfig(name)?.context : undefined;
        return contextId ? {contextId, specificity: this.specificity(`/model/${name}`)} : undefined;
    }

    /** Model config by resource name, matched the way the model routes match it. */
    private findModelConfig(name: string): ModelConfig | undefined {
        const models = this.adminizer.config.models ?? {};
        const key = Object.prototype.hasOwnProperty.call(models, name)
            ? name
            : (() => {
                const keys = Object.keys(models).filter((candidate) => candidate.toLowerCase() === name.toLowerCase());
                return keys.length === 1 ? keys[0] : undefined;
            })();
        const config = key ? models[key] : undefined;
        return config && typeof config === "object" ? config : undefined;
    }

    private isAuthPath(path: string): boolean {
        const root = this.root();
        if (path === `${root}/init_user` || path.startsWith(`${root}/init_user/`)) return true;
        if (!path.startsWith(`${root}/model/`)) return false;
        const action = path.slice(root.length + "/model/".length).split("/")[1];
        return action === "login" || action === "logout" || action === "register";
    }

    /** A route pattern as a regexp: `:param`, `*splat` and `{optional}` parts of Express routes. */
    private compilePattern(pattern: string, exact: boolean): RegExp {
        const source = pattern
            .replace(/[.+?^$()|[\]\\]/g, "\\$&")
            .replace(/:[A-Za-z0-9_]+/g, "[^/]+")
            .replace(/\*[A-Za-z0-9_]*/g, ".+")
            .replace(/\{/g, "(?:")
            .replace(/\}/g, ")?");
        return new RegExp(`^${source}${exact ? "" : "(?:/.*)?"}$`);
    }

    /** Static segments weigh more than parameters. */
    private specificity(relativePath: string): number {
        return relativePath.split("/").filter(Boolean)
            .reduce((score, segment) => score + (/^[:*]/.test(segment) ? 1 : 2), 0);
    }

    private isPageRequest(req: ReqType): boolean {
        return req.headers["x-inertia"] !== undefined || (req.headers.accept ?? "").includes("text/html");
    }

    private root(): string {
        return (this.adminizer.config.routePrefix || "").replace(/\/+$/, "");
    }

    private fullPrefix(context: Pick<AdminContext, "prefix">): string {
        return `${this.root()}${context.prefix}`;
    }

    private normalizePrefix(prefix: string): string {
        const trimmed = (prefix ?? "").trim().replace(/\/+$/, "");
        return trimmed && !trimmed.startsWith("/") ? `/${trimmed}` : trimmed;
    }

    private normalizePath(url: string): string {
        return (url || "").split(/[?#]/)[0].replace(/\/+$/, "");
    }

    private requestPath(req: ReqType): string {
        return this.normalizePath(req.originalUrl || req.url || "");
    }

    private readCookie(req: ReqType): string | undefined {
        const value = req.cookies?.[CONTEXT_COOKIE];
        return typeof value === "string" ? value : undefined;
    }
}
