// Control entry and CSS names are intentionally stable (see
// vite.config.controls.ts), so the version query is what invalidates caches.
// It must be the runtime version from the page, matching what the server-side
// `withAssetVersion` puts on the same files — a build-time constant would be
// frozen at the repository version and never change between releases.
const assetVersion = (): string => window.adminizerVersion ?? '';

const getControlModulePath = (name: string): string => import.meta.env.DEV
    ? `/src/assets/js/controls/${name}.tsx`
    : `${window.routePrefix}/assets/controls/${name}.es.js?v=${assetVersion()}`;

const getControlCssPath = (name: string): string | undefined => import.meta.env.DEV
    ? undefined
    : `${window.routePrefix}/assets/controls/${name}.css?v=${assetVersion()}`;

export function getLazyControlPaths(name: string): {
    modulePath: string;
    cssPath?: string;
} {
    return {
        modulePath: getControlModulePath(name),
        cssPath: getControlCssPath(name),
    };
}
