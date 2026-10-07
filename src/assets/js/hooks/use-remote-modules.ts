import {useEffect, useState} from 'react';

export type RemoteModule = Record<string, unknown>;

const pendingModules = new Map<string, Promise<RemoteModule>>();
/** Modules already imported, readable synchronously on later renders. */
const loadedModules = new Map<string, RemoteModule>();

/** Imports an ES module by URL once. */
export function loadRemoteModule(url: string): Promise<RemoteModule> {
    let pending = pendingModules.get(url);
    if (!pending) {
        pending = import(/* @vite-ignore */ url).then((module) => {
            loadedModules.set(url, module);
            return module;
        });
        // A failed import must be retried on the next visit, not cached.
        pending.catch(() => pendingModules.delete(url));
        pendingModules.set(url, pending);
    }
    return pending;
}

function loadStylesheet(href: string): void {
    const loaded = [...document.head.querySelectorAll("link[rel='stylesheet']")]
        .some((link) => (link as HTMLLinkElement).href.includes(href));
    if (loaded) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

const NO_MODULES: (RemoteModule | null)[] = [];
const NO_ERRORS: unknown[] = [];

/**
 * Loads several ES modules and returns them in the given order, `null` in
 * place of a module that failed (reported in `errors`). Modules imported
 * before are returned on the first render, without a loading state.
 */
export function useRemoteModules(urls: string[], stylesheets: string[] = []) {
    const key = urls.join('\n');
    const cached = urls.every((url) => loadedModules.has(url))
        ? urls.map((url) => loadedModules.get(url)!)
        : null;
    const [state, setState] = useState<{ key: string; modules: (RemoteModule | null)[]; errors: unknown[] }>(
        {key: '', modules: NO_MODULES, errors: []},
    );

    useEffect(() => {
        stylesheets.forEach(loadStylesheet);
        if (cached) return;
        let cancelled = false;
        Promise.allSettled(urls.map(loadRemoteModule)).then((results) => {
            if (cancelled) return;
            setState({
                key,
                modules: results.map((result) => result.status === 'fulfilled' ? result.value : null),
                errors: results.flatMap((result) => result.status === 'rejected' ? [result.reason] : []),
            });
        });
        return () => {
            cancelled = true;
        };
        // `key` stands for `urls`, and `cached` is derived from it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, stylesheets.join('\n')]);

    if (!urls.length || cached) return {modules: cached ?? NO_MODULES, loading: false, errors: NO_ERRORS};
    return state.key === key
        ? {modules: state.modules, loading: false, errors: state.errors}
        : {modules: null, loading: true, errors: NO_ERRORS};
}
