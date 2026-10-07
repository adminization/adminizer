import path from "path";
import {routePrefix} from "../../adminizerConfig";
import {AbstractAdminizerApp, Adminizer, AppAsset, AppSetupContext} from "../../../dist";

/** An ES module of this folder, built by `npm run build:context-apps`. */
const asset = (id: string, name: string): AppAsset => ({
    id,
    filePath: path.resolve(import.meta.dirname, `${name}.es.js`),
    devUrl: `/fixture/apps/contexts/${name}.tsx`,
});

/** The component of every demo page. */
const PAGE = asset("page", "ContextDemoPage");

/** Props of a demo page: what it says and where it links. */
const text = (title: string, body: string, links: { title: string; href: string }[] = []) => ({
    data: {title, text: body, links},
});

/**
 * Host side: overrides a part of the default context's layout. Contexts that
 * inherit the default layout (System below) get the override as well.
 */
export function configureDefaultContext(adminizer: Adminizer): void {
    const overrides = adminizer.assetHandler.register("host", asset("default-shell-overrides", "DefaultShellOverrides"));
    adminizer.contextHandler.configureDefault({layout: {module: overrides}});
}

/**
 * Own navbar, inherited layout with two parts overridden: the cheapest kind
 * of context. Its navbar also links to built-in model pages: Categories stays
 * in the context while the user comes from it (cookie), Json schema always
 * opens in it — its model declares `context: "system"` (fixture/adminizerConfig.ts).
 */
export class SystemContextApp extends AbstractAdminizerApp {
    readonly name = "context-system";
    readonly version = "1.0.0";

    constructor() {
        super();
    }

    setup(ctx: AppSetupContext): void {
        const system = ctx.context({
            id: "system",
            title: "System",
            icon: "settings",
            prefix: "/system",
            layout: {module: asset("overrides", "SystemShellOverrides")},
            navbar: {sections: {System: {icon: "settings", order: 1}, Data: {icon: "storage", order: 2}}},
        });
        system.page({
            id: "system-overview", title: "Overview", icon: "dashboard", path: "", section: "System",
            component: PAGE, props: text("Overview", "Stock layout, context-specific navbar."),
        });
        system.page({
            id: "system-settings", title: "Settings", icon: "tune", path: "/settings", section: "System",
            component: PAGE, props: text("Settings", "A second page of the System context."),
        });
        system.menuItem({
            id: "system-categories", title: "Categories (built-in page)", icon: "category",
            link: `${routePrefix}/model/Category`, type: "self", section: "Data",
            accessRightsToken: "read-Category-model",
        });
        system.menuItem({
            id: "system-json-schema", title: "Json schema (declared page)", icon: "data_object",
            link: `${routePrefix}/model/JsonSchema`, type: "self", section: "Data",
            accessRightsToken: "read-JsonSchema-model",
        });
    }
}

/**
 * Partially inherited layout: its own sidebar (the `Sidebar` part) next to
 * the stock header (breadcrumbs, search, notifications, user menu).
 */
export class SupportContextApp extends AbstractAdminizerApp {
    readonly name = "context-support";
    readonly version = "1.0.0";

    constructor() {
        super();
    }

    setup(ctx: AppSetupContext): void {
        const support = ctx.context({
            id: "support",
            title: "Support desk",
            icon: "support_agent",
            prefix: "/support",
            layout: {module: asset("layout", "SupportLayout")},
        });
        support.page({
            id: "support-inbox", title: "Inbox", icon: "inbox", path: "",
            component: PAGE, props: text("Inbox", "Own sidebar, stock header."),
        });
        support.page({
            id: "support-open", title: "Open tickets", icon: "confirmation_number", path: "/tickets", badge: 7,
            component: PAGE, props: text("Open tickets", "Tickets waiting for an answer."),
        });
        support.page({
            id: "support-macros", title: "Macros", icon: "bolt", path: "/macros",
            component: PAGE, props: text("Macros", "Canned replies."),
        });
    }
}

/** Fully custom layout: a top bar instead of the sidebar, nothing inherited. */
export class StudioContextApp extends AbstractAdminizerApp {
    readonly name = "context-studio";
    readonly version = "1.0.0";

    constructor() {
        super();
    }

    setup(ctx: AppSetupContext): void {
        const studio = ctx.context({
            id: "studio",
            title: "Studio",
            icon: "movie",
            prefix: "/studio",
            layout: {module: asset("layout", "StudioLayout"), base: "stock"},
        });
        studio.page({
            id: "studio-home", title: "Projects", icon: "movie", path: "",
            component: PAGE, props: text("Projects", "A layout written from scratch: top navigation, no sidebar."),
        });
        studio.page({
            id: "studio-assets", title: "Assets", icon: "perm_media", path: "/assets",
            component: PAGE, props: text("Assets", "Media of the studio."),
        });
        studio.page({
            id: "studio-render", title: "Render queue", icon: "pending_actions", path: "/render",
            component: PAGE, props: text("Render queue", "Jobs in progress."),
        });
    }
}

/**
 * Host side: a context registered without an app. It inherits the default
 * layout and overrides the remaining stock parts (the whole sidebar and
 * header, the sidebar header and content, the header start) with a
 * stylesheet of its own. The switcher leads to `home`, not to the prefix.
 * Only users holding the `context-reports` token see the context and may
 * open its pages: the token is given once, to the context.
 */
export function registerReportsContext(adminizer: Adminizer): void {
    const token = "context-reports";
    adminizer.accessRightsHelper.registerToken({
        id: token,
        name: "Reports",
        description: "Access to the Reports context",
        department: "Contexts",
    });

    const host = (resource: AppAsset) => adminizer.assetHandler.register("host", resource);
    const page = host(asset("reports-page", "ContextDemoPage"));
    const prefix = "/reports";
    const reports = adminizer.contextHandler.register({
        id: "reports",
        title: "Reports",
        icon: "bar_chart",
        prefix,
        home: `${prefix}/summary`,
        accessRightsToken: token,
        layout: {
            module: host(asset("reports-overrides", "ReportsShellOverrides")),
            stylesheet: host({
                id: "reports-overrides-css",
                filePath: path.resolve(import.meta.dirname, "ReportsShellOverrides.css"),
            }),
        },
        navbar: {sections: {Reports: {icon: "bar_chart", order: 1}}},
    });

    reports.page({
        id: "reports-summary", title: "Summary", icon: "summarize", path: "/summary", section: "Reports",
        component: page, props: text("Summary", "Context home: inherited layout, five parts overridden, own stylesheet."),
    });
    reports.page({
        id: "reports-overview", title: "Overview", icon: "insights", path: "", section: "Reports",
        component: page, props: text("Overview", "The prefix page. The switcher leads to Summary instead (`home`)."),
    });
    // Pages of a group: no menu items of their own, the group item lists them.
    const daily = reports.page({
        id: "reports-daily", title: "Daily sales", icon: "today", path: "/sales/daily", menu: false,
        component: page, props: text("Daily sales", "A sub-item of the Sales group."),
    });
    const monthly = reports.page({
        id: "reports-monthly", title: "Monthly sales", icon: "calendar_month", path: "/sales/monthly", menu: false,
        component: page, props: text("Monthly sales", "Another sub-item of the Sales group."),
    });
    reports.menuItem({
        id: "reports-sales", title: "Sales", icon: "payments", link: daily.link, type: "self", section: "Reports",
        subItems: [daily, monthly],
    });
}

/**
 * Three contexts of one app, for the remaining layout values:
 * - Inherited: neither layout nor navbar given — everything comes from the
 *   default context, its overrides included;
 * - Plain: `layout: "stock"` — the stock layout without any override;
 * - Kiosk: `layout: "none"`, hidden from the switcher, reached by link only.
 */
export class VariantsContextApp extends AbstractAdminizerApp {
    readonly name = "context-variants";
    readonly version = "1.0.0";

    constructor() {
        super();
    }

    setup(ctx: AppSetupContext): void {
        const kiosk = `${routePrefix}/kiosk`;

        // `menu: false` keeps the inherited menu: a menu item would make it the context's own.
        ctx.context({id: "inherited", title: "Inherited", icon: "account_tree", prefix: "/inherited"}).page({
            id: "inherited-home", title: "Inherited", icon: "account_tree", path: "", menu: false,
            component: PAGE, props: text("Inherited",
                "No layout and no navbar given: the default context's menu and its sidebar footer override are inherited.",
                [{title: "Open the Kiosk context (hidden from the switcher)", href: kiosk}]),
        });

        const plain = ctx.context({id: "plain", title: "Plain", icon: "crop_square", prefix: "/plain", layout: "stock"});
        plain.page({
            id: "plain-home", title: "Plain", icon: "crop_square", path: "",
            component: PAGE, props: text("Plain", "layout: \"stock\" — the stock layout without the default context's overrides (no badge in the footer)."),
        });
        plain.page({
            id: "plain-second", title: "Second page", icon: "article", path: "/second",
            component: PAGE, props: text("Second page", "Own navbar, stock layout."),
        });

        ctx.context({id: "kiosk", title: "Kiosk", icon: "tv", prefix: "/kiosk", layout: "none", switcher: false}).page({
            id: "kiosk-home", title: "Kiosk", icon: "tv", path: "", menu: false,
            component: PAGE, props: text("Kiosk",
                "layout: \"none\" — no shell at all. switcher: false — this context is not in the switcher.",
                [{title: "Back to the panel", href: routePrefix}]),
        });
    }
}
