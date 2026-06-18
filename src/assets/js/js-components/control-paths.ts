const getControlModulePath = (name: string): string => import.meta.env.DEV
    ? `/src/assets/js/controls/${name}.tsx`
    : `${window.routePrefix}/assets/controls/${name}.es.js`;

const getControlCssPath = (name: string): string | undefined => import.meta.env.DEV
    ? undefined
    : `${window.routePrefix}/assets/controls/${name}.css`;

export function getLazyControlPaths(name: string): {
    modulePath: string;
    cssPath?: string;
} {
    return {
        modulePath: getControlModulePath(name),
        cssPath: getControlCssPath(name),
    };
}
