declare const __APP_VERSION__: string;

// Control entry and CSS names are intentionally stable (see
// vite.config.controls.ts), so the version query is what invalidates caches.
const getControlModulePath = (name: string): string => import.meta.env.DEV
    ? `/src/assets/js/controls/${name}.tsx`
    : `${window.routePrefix}/assets/controls/${name}.es.js?v=${__APP_VERSION__}`;

const getControlCssPath = (name: string): string | undefined => import.meta.env.DEV
    ? undefined
    : `${window.routePrefix}/assets/controls/${name}.css?v=${__APP_VERSION__}`;

export function getLazyControlPaths(name: string): {
    modulePath: string;
    cssPath?: string;
} {
    return {
        modulePath: getControlModulePath(name),
        cssPath: getControlCssPath(name),
    };
}
