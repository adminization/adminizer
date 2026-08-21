import {adminApi} from '@/lib/admin-api';

/**
 * The documentation API as the browser sees it. Nothing but ids and metadata
 * ever crosses this line: where the documents live and how they are stored is
 * a detail of the server-side implementation.
 */

export interface DocMeta {
    id: string;
    title: string;
    section?: string;
    keywords: string[];
    models: string[];
    urls: string[];
    locales?: string[];
}

export interface DocSearchResult extends DocMeta {
    snippets: string[];
}

export interface DocContent {
    meta: DocMeta;
    markdown: string;
    locale: string;
}

export interface DocSchemaField {
    name: string;
    title: string;
    type: string;
    required: boolean;
}

export interface DocSchema {
    model: string;
    title: string;
    url: string;
    fields: DocSchemaField[];
}

export interface DocSearchParams {
    query?: string;
    keywords?: string[];
    url?: string;
    model?: string;
    locale?: string;
}

const apiRoot = (): string => `${window.routePrefix ?? ''}/docs/api`;

/** The viewer page of a document; the drawer uses the `#info=` hash instead. */
export const docHref = (id: string): string => `${window.routePrefix ?? ''}/docs/${encodeURIComponent(id)}`;

export const docsApi = {
    list: async (locale?: string, signal?: AbortSignal): Promise<DocMeta[]> => {
        const {data} = await adminApi.getJson<{documents: DocMeta[]}>(`${apiRoot()}/list`, {params: {locale}, signal});
        return data.documents ?? [];
    },

    keywords: async (locale?: string, signal?: AbortSignal): Promise<Record<string, string[]>> => {
        const {data} = await adminApi.getJson<{keywords: Record<string, string[]>}>(`${apiRoot()}/keywords`, {
            params: {locale},
            signal,
        });
        return data.keywords ?? {};
    },

    search: async (params: DocSearchParams, signal?: AbortSignal): Promise<DocSearchResult[]> => {
        const {data} = await adminApi.getJson<{results: DocSearchResult[]}>(`${apiRoot()}/search`, {
            params: {
                q: params.query || undefined,
                keywords: params.keywords?.length ? params.keywords.join(',') : undefined,
                url: params.url || undefined,
                model: params.model || undefined,
                locale: params.locale || undefined,
            },
            signal,
        });
        return data.results ?? [];
    },

    context: async (url: string, model?: string, locale?: string, signal?: AbortSignal): Promise<DocMeta[]> => {
        const {data} = await adminApi.getJson<{documents: DocMeta[]}>(`${apiRoot()}/context`, {
            params: {url, model, locale},
            signal,
        });
        return data.documents ?? [];
    },

    doc: async (id: string, locale?: string, signal?: AbortSignal): Promise<DocContent> => {
        const {data} = await adminApi.getJson<DocContent>(`${apiRoot()}/doc/${encodeURIComponent(id)}`, {
            params: {locale},
            signal,
        });
        return data;
    },

    /** Which of the references written in a document point at a readable document. */
    resolve: async (from: string, refs: string[], signal?: AbortSignal): Promise<Record<string, string>> => {
        if (refs.length === 0) return {};
        const {data} = await adminApi.getJson<{resolved: Record<string, string>}>(`${apiRoot()}/resolve`, {
            params: {from, refs: refs.join(',')},
            signal,
        });
        return data.resolved ?? {};
    },

    schema: async (model: string, signal?: AbortSignal): Promise<DocSchema> => {
        const {data} = await adminApi.getJson<DocSchema>(`${apiRoot()}/schema`, {params: {model}, signal});
        return data;
    },
};
