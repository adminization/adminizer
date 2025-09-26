import flash from "../lib/inertia/flash";
import inertia, {Page} from "../lib/inertia/inertiaAdapter";
import fs from "fs";
import path from "node:path";
import {Adminizer} from "../lib/Adminizer";
import {InertiaMenuHelper} from "../helpers/inertiaMenuHelper";

export function bindInertia(adminizer: Adminizer) {

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

            // For Sails JS
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
        return `
       <!DOCTYPE html><html lang="${_viewData.lang}">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta charset="utf-8"><title inertia></title>
            <link rel="icon" type="image/png" href="${adminizer.config.routePrefix}/files/favicon.png">
            ${viteRender()}
            </head>
        <body>
            <div id="app" data-page='${JSON.stringify(page)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")}'></div>
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
                enabled: true,
                cookieName: 'XSRF-TOKEN',
                headerName: 'x-xsrf-token'
            },
        })
    );


    adminizer.app.use((req: ReqType, _, next) => {
        checkAuth(req, adminizer)

        req.Inertia.setViewData({
            lang: req.user?.locale || 'en',
        })
        const menuHelper = new InertiaMenuHelper(adminizer)

        req.Inertia.shareProps({
            auth: {
                user: req.session.userPretended ?? req.user
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
            showVersion: req.adminizer.config.showVersion ?? false,
            notifications: req.adminizer.config.notifications.enabled ?? false,
            aiAssistant: {
                enabled: req.adminizer.config.aiAssistant?.enabled ?? false,
                defaultModel: req.adminizer.config.aiAssistant?.defaultModel ?? null,
            },
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

}
