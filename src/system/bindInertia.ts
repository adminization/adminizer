import flash from "../lib/inertia/flash";
import inertia, { Page } from "../lib/inertia/inertiaAdapter";
import fs from "fs";
import path from "node:path";
import { Adminizer } from "../lib/Adminizer";
import { InertiaMenuHelper } from "../helpers/inertiaMenuHelper";
import { getUiTranslations } from "../lib/ui-i18n/getUiTranslations";
import { COMMON_UI_TRANSLATION_KEYS } from "../lib/ui-i18n/uiTranslationKeys";

export function bindInertia(adminizer: Adminizer) {
    const escapeHtmlAttribute = (value: string): string => value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const serializePageForScript = (value: unknown): string => JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");

    const resolveFaviconHref = (): string => {
        const customFavicon = adminizer.config.favicon?.trim();
        if (!customFavicon) {
            return `${adminizer.config.routePrefix}/files/favicon.png`;
        }

        if (/^[a-z][a-z0-9+.-]*:/i.test(customFavicon) || customFavicon.startsWith("//")) {
            return customFavicon;
        }

        if (customFavicon.startsWith("/")) {
            return customFavicon;
        }

        return `${adminizer.config.routePrefix}/${customFavicon.replace(/^\/+/, "")}`;
    };

    const viteRender = () => {
        if (process.env.VITE_ENV === 'dev') {
            return `
                    <script type="module">
                        import RefreshRuntime from "/@react-refresh"
                        RefreshRuntime.injectIntoGlobalHook(window)
                        window.$RefreshReg$ = () => {}
                        window.$RefreshSig$ = () => (type) => type
                        window.__vite_plugin_react_preamble_installed__ = true
                    </script>
                    <script type="module" src="/@vite/client"></script>
                    <script type="module" src="/src/assets/js/app.tsx"></script>
                    <script>window.routePrefix = "${adminizer.config.routePrefix}"</script>
                    <script>window.bindPublic = ${adminizer.config.bind?.public}</script>
                    `
        } else {
            const manifestPath = path.resolve(import.meta.dirname, '../assets/manifest.json');
            if (!fs.existsSync(manifestPath)) {
                console.warn('[vite]: Warning: manifest.json not found in dist folder! Please run "npm run build:assets" first.');
                return '';
            }

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            const entry = manifest['src/assets/js/app.tsx'];

            if (!entry) {
                console.error('[vite]: Entry point not found in manifest.json');
                return '';
            }

            // Preload critical resources
            const preloadLinks = [];
            const stylesheets: string[] = [];
            const scripts = [];

            // CSS resources
            if (entry.css) {
                entry.css.forEach((file: string) => {
                    const href = `${adminizer.config.routePrefix}/assets/${file}`;
                    preloadLinks.push(`<link rel="preload" href="${href}" as="style">`);
                    stylesheets.push(`<link rel="stylesheet" href="${href}">`);
                });
            }

            // JS resource
            if (entry.file) {
                const href = `${adminizer.config.routePrefix}/assets/${entry.file}`;
                preloadLinks.push(`<link rel="modulepreload" href="${href}" as="script">`);
                scripts.push(`<script type="module" src="${href}"></script>`);
            }


            // Load modules CSS
            const modulesCss = adminizer.controlsHandler.collectAndGenerateStyleLinks()
            modulesCss.forEach(cssPath => {
                preloadLinks.push(`<link rel="preload" href="${cssPath}" as="style">`);
                stylesheets.push(`<link rel="stylesheet" href="${cssPath}">`);
            })

            // Route prefix script
            const routePrefixScript = `<script>window.routePrefix = "${adminizer.config.routePrefix}";</script>`;

            const bindPublic = `<script>window.bindPublic = ${adminizer.config.bind?.public}</script>`;
            return `
                ${preloadLinks.join('\n')}
                ${stylesheets.join('\n')}
                ${scripts.join('\n')}
                ${routePrefixScript}
                ${bindPublic}
        `;
        }
    };

    const getHtml = (page: Page, _viewData: Record<string, string>) => {
        const faviconHref = escapeHtmlAttribute(resolveFaviconHref());
        const serializedPage = serializePageForScript(page);

        return `
       <!DOCTYPE html><html lang="${_viewData.lang}">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta charset="utf-8"><title inertia></title>
            <link rel="icon" type="image/png" href="${faviconHref}">
            ${viteRender()}
            </head>
        <body>
            <script data-page="app" type="application/json">${serializedPage}</script>
            <div id="app"></div>
        </body>
        </html>
        `;
    };

    // flash messages
    adminizer.app.use(flash());

    // inertia adapter
    adminizer.app.use(
        inertia({
            version: '1',
            html: getHtml,
            flashMessages: (req: ReqType) => {
                return req.flash.flashAll();
            },
            csrf: {
                enabled: adminizer.configHelper.isCsrfEnabled(),
                cookieName: 'XSRF-TOKEN',
                headerName: 'x-xsrf-token'
            }
        })
    );


    adminizer.app.use((req: ReqType, _, next) => {
        checkAuth(req, adminizer)
        const defaultLocale = typeof req.adminizer.config.translation !== "boolean"
            ? req.adminizer.config.translation.defaultLocale
            : "en";
        const locale = req.user?.locale || defaultLocale;
        const commonMessages = getUiTranslations(req, COMMON_UI_TRANSLATION_KEYS);

        req.Inertia.setViewData({
            lang: locale,
        })
        const menuHelper = new InertiaMenuHelper(adminizer)

        req.Inertia.shareProps({
            auth: {
                user: req.session.userPretended ?? req.user
            },
            routePrefix: req.adminizer.config.routePrefix,
            i18n: {
                locale,
                common: commonMessages,
            },
            menu: req.user ? menuHelper.getMenuItems(req) : null,
            title: menuHelper.getBrandTitle(),
            brand: menuHelper.getBrandTitle(),
            logout: menuHelper.getLogoutUrl(),
            logoutBtn: req.i18n.__("Log out"),
            section: req.user ? [
                {
                    title: req.i18n.__("Adminpanel"),
                    id: "adminpanel-0",
                    link: req.adminizer.config.routePrefix,
                    icon: "rocket_launch",
                },
                ...((req.adminizer.configHelper.getConfig().sections || [])
                    .map((sec: any) => ({
                        ...sec,
                        title: req.i18n.__(sec.title),
                    }))
                )
            ] : null,
            version: (() => {
                const v = req.adminizer.config.showVersion;
                if (!v) return null;
                if (v === true)   return { text: null, link: null, hint: null };
                if (typeof v === 'string') return { text: v, link: null, hint: null };
                return { text: v.text ?? null, link: v.link ?? null, hint: v.hint ?? null };
            })(),
            showFeedback: req.adminizer.feedbackHandler?.isRegistered() ?? false,
            feedbackTriggerLabel: req.adminizer.feedbackHandler?.getTriggerLabel() ?? null,
            feedbackPlaceholder: req.adminizer.feedbackHandler?.getPlaceholder() ?? null,
            notifications: req.adminizer.config.notifications.enabled ?? false,
            aiAssistant: {
                enabled: req.adminizer.config.aiAssistant?.enabled ?? false,
                defaultModel: req.adminizer.config.aiAssistant?.defaultModel ?? null,
            },
            history: req.user
                ?
                (req.adminizer.config.history.enabled ? req.adminizer.accessRightsHelper.hasPermission(
                    `history-${req.adminizer.config.history?.adapter ?? 'default'}`,
                    req.user
                ) : false)
                :
                false
        });

        next();
    })
}

function checkAuth(req: ReqType, adminizer: Adminizer) {
    let locale: string = ""

    if (typeof adminizer.config.translation !== 'boolean') {
        locale = adminizer.config.translation.defaultLocale
    }
    if (!adminizer.config.auth.enable) {
        if (req.user) {
            req.user.isAdministrator = true;
        } else {
            req.user = {
                id: 0,
                isAdministrator: true,
                locale: locale,
                login: "admin",
                email: "email@email.com",
            }
        }
    }

    if (req.i18n && typeof adminizer.config.translation !== 'boolean') {
        req.i18n.setLocale(req.user?.locale || adminizer.config.translation.defaultLocale);
    }
}
