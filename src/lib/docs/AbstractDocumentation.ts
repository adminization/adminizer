import type {Adminizer} from '../Adminizer';

export interface DocMeta {
    /** Stable document identifier; the only handle that ever leaves the abstraction. */
    id: string;
    /** Title in the requested locale when a translation exists. */
    title: string;
    /** Viewer grouping. */
    section?: string;
    keywords: string[];
    /** Model resource names this document is about. */
    models: string[];
    /** Express-style admin path patterns (`:id` placeholders) the document is bound to. */
    urls: string[];
    /**
     * Per-document access right, required on top of the base documentation
     * token. References an existing token (registered by the host or an app);
     * documentation never creates tokens itself.
     */
    accessRightsToken?: string;
    /** Locales this document is available in. */
    locales?: string[];
}

export interface DocContent {
    meta: DocMeta;
    /** Content in the locale that was actually served. */
    markdown: string;
    locale: string;
}

export interface DocSearchQuery {
    /** Full-text query; matched against title, keywords and content. */
    query?: string;
    /** Every listed keyword must be present on the document. */
    keywords?: string[];
    /** Narrow the scope to documents bound to this admin path. */
    url?: string;
    /** Narrow the scope to documents bound to this model. */
    model?: string;
}

export interface DocSearchResult {
    meta: DocMeta;
    /** Matched lines with a little surrounding context, best matches first. */
    snippets: string[];
}

const SNIPPET_LIMIT = 3;
const SNIPPET_CONTEXT = 120;

/**
 * The single contract of the documentation subsystem. Everything adminizer
 * does with documentation — listing, reading, searching, resolving links —
 * goes through this class; where documents live, how translations are stored
 * and how search works are private details of the implementation.
 *
 * One implementation is active per adminizer instance (a singleton registered
 * on startup). Implementations know nothing about users or permissions: the
 * access layer is applied by adminizer on top of every result.
 *
 * Only `list` and `get` are required. The base class implements search,
 * context matching, the keyword map and link resolution on top of them; an
 * implementation overrides any of those when it can do better (e.g. database
 * full-text search).
 */
export abstract class AbstractDocumentation {
    /** Set when the implementation is registered; not part of the contract. */
    public adminizer!: Adminizer;

    /**
     * Metadata of every document, without content, in the requested locale.
     * Falls back to the best available translation per document.
     */
    public abstract list(locale?: string): Promise<DocMeta[]>;

    /**
     * One document in the requested locale. How the translation is obtained
     * is up to the implementation; when the locale is unavailable it serves
     * the best available version and reports which locale it actually is.
     */
    public abstract get(id: string, locale?: string): Promise<DocContent | undefined>;

    /**
     * Keyword filter plus full-text scan over `list()`/`get()`. Content is
     * only fetched for documents that survive the metadata filters.
     */
    public async search(query: DocSearchQuery, locale?: string): Promise<DocSearchResult[]> {
        const wanted = (query.query ?? '').trim().toLowerCase();
        const keywords = (query.keywords ?? []).map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
        let candidates = await this.forContext({url: query.url, model: query.model}, locale);
        if (keywords.length > 0) {
            candidates = candidates.filter((meta) => {
                const present = meta.keywords.map((keyword) => keyword.toLowerCase());
                return keywords.every((keyword) => present.includes(keyword));
            });
        }
        if (!wanted) return candidates.map((meta): DocSearchResult => ({meta, snippets: []}));

        const results: DocSearchResult[] = [];
        for (const meta of candidates) {
            const inMeta = meta.title.toLowerCase().includes(wanted)
                || meta.keywords.some((keyword) => keyword.toLowerCase().includes(wanted));
            const content = await this.get(meta.id, locale);
            const snippets = content ? this.extractSnippets(content.markdown, wanted) : [];
            if (inMeta || snippets.length > 0) results.push({meta, snippets});
        }
        return results;
    }

    /** Documents bound to a place in the admin panel: a URL and/or a model. */
    public async forContext(ctx: {url?: string; model?: string}, locale?: string): Promise<DocMeta[]> {
        const documents = await this.list(locale);
        const url = ctx.url?.trim();
        const model = ctx.model?.trim();
        if (!url && !model) return documents;
        return documents.filter((meta) =>
            (!url || meta.urls.some((pattern) => this.matchesUrl(pattern, url)))
            && (!model || meta.models.includes(model)),
        );
    }

    /** Keyword → document ids, aggregated from metadata. */
    public async keywords(locale?: string): Promise<Map<string, string[]>> {
        const map = new Map<string, string[]>();
        for (const meta of await this.list(locale)) {
            for (const raw of meta.keywords) {
                const keyword = raw.trim();
                if (!keyword) continue;
                const ids = map.get(keyword) ?? [];
                if (!ids.includes(meta.id)) ids.push(meta.id);
                map.set(keyword, ids);
            }
        }
        return map;
    }

    /**
     * Resolves a reference written inside `fromId` to the id of the target
     * document. How authors spell references is implementation-specific; the
     * default only understands plain document ids (with an optional anchor).
     */
    public async resolveLink(_fromId: string, ref: string): Promise<string | undefined> {
        const id = ref.trim().replace(/#.*$/, '');
        if (!id) return undefined;
        const documents = await this.list();
        return documents.find((meta) => meta.id === id)?.id;
    }

    /**
     * Change notification: consumers subscribe to drop their caches. Optional;
     * implementations without it are treated as static.
     */
    public onChange?(cb: (ids?: string[]) => void): void;

    /** Matches an Express-style pattern (`/model/:name`) against a concrete path. */
    protected matchesUrl(pattern: string, url: string): boolean {
        const path = url.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
        const source = pattern.replace(/\/+$/, '') || '/';
        const regex = new RegExp(`^${
            source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z0-9_]+/g, '[^/]+')
        }$`);
        return regex.test(path);
    }

    /** Lines containing the query, trimmed to a little context around the match. */
    protected extractSnippets(markdown: string, query: string): string[] {
        const snippets: string[] = [];
        for (const line of markdown.split('\n')) {
            const index = line.toLowerCase().indexOf(query);
            if (index === -1) continue;
            const start = Math.max(0, index - SNIPPET_CONTEXT / 2);
            const snippet = line.slice(start, start + query.length + SNIPPET_CONTEXT).trim();
            snippets.push(`${start > 0 ? '…' : ''}${snippet}${start + query.length + SNIPPET_CONTEXT < line.length ? '…' : ''}`);
            if (snippets.length >= SNIPPET_LIMIT) break;
        }
        return snippets;
    }
}
