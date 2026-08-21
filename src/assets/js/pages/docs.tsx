import {useCallback, useEffect, useMemo, useState} from 'react';
import {router} from '@inertiajs/react';
import {BookOpen, ChevronLeft, ChevronRight, FileText, Search, Sparkles, X} from 'lucide-react';
import {withAppLayout} from '@/layouts/with-app-layout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {MarkdownView, extractHeadings} from '@/components/markdown-view';
import {useDoc} from '@/hooks/use-doc';
import {useI18n} from '@/hooks/use-i18n';
import {docHref, docsApi, type DocMeta, type DocSearchResult} from '@/lib/docs-api';
import {sendDocToAssistant} from '@/lib/docs-assistant';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {cn} from '@/lib/utils';

interface DocsPageProps {
    docId: string | null;
}

const readParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        query: params.get('q') ?? '',
        keywords: (params.get('keyword') ?? '').split(',').map((keyword) => keyword.trim()).filter(Boolean),
    };
};

/** The state of the search lives in the query string, so a result is linkable. */
const searchSuffix = (query: string, keywords: string[]): string => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (keywords.length > 0) params.set('keyword', keywords.join(','));
    const search = params.toString();
    return search ? `?${search}` : '';
};

const DocsPage = ({docId}: DocsPageProps) => {
    const {t, locale: userLocale} = useI18n();
    const {isEnabled: assistantEnabled, openChat} = useAiAssistant();

    const initial = useMemo(readParams, []);
    const [query, setQuery] = useState(initial.query);
    const [keywords, setKeywords] = useState<string[]>(initial.keywords);
    const [documents, setDocuments] = useState<DocMeta[] | null>(null);
    const [keywordMap, setKeywordMap] = useState<Record<string, string[]>>({});
    const [results, setResults] = useState<DocSearchResult[] | null>(null);
    const [locale, setLocale] = useState<string | undefined>(undefined);

    const {content, docLinks, loading, error} = useDoc(docId, locale ?? userLocale);

    // A different document starts over in the reader's own language.
    useEffect(() => setLocale(undefined), [docId]);

    useEffect(() => {
        const controller = new AbortController();
        docsApi.list(userLocale, controller.signal).then(setDocuments).catch(() => setDocuments([]));
        docsApi.keywords(userLocale, controller.signal).then(setKeywordMap).catch(() => setKeywordMap({}));
        return () => controller.abort();
    }, [userLocale]);

    // Keyword chips and the full-text query are one filter: both narrow the
    // same list and both are kept in the URL.
    useEffect(() => {
        const suffix = searchSuffix(query, keywords);
        window.history.replaceState(null, '', `${window.location.pathname}${suffix}${window.location.hash}`);

        if (!query.trim() && keywords.length === 0) {
            setResults(null);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            docsApi.search({query, keywords, locale: userLocale}, controller.signal)
                .then(setResults)
                .catch(() => setResults([]));
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [keywords, query, userLocale]);

    const openDoc = useCallback((id: string) => {
        router.visit(`${docHref(id)}${searchSuffix(query, keywords)}`, {preserveState: true, preserveScroll: true});
    }, [keywords, query]);

    const toggleKeyword = (keyword: string) => {
        setKeywords((current) => current.includes(keyword)
            ? current.filter((item) => item !== keyword)
            : [...current, keyword]);
    };

    const visible: DocMeta[] = results ?? documents ?? [];
    const sections = useMemo(() => {
        const grouped = new Map<string, DocMeta[]>();
        for (const meta of visible) {
            const key = meta.section ?? '';
            grouped.set(key, [...(grouped.get(key) ?? []), meta]);
        }
        return [...grouped.entries()];
    }, [visible]);

    // Prev/next walk the section the open document belongs to.
    const siblings = useMemo(() => {
        if (!docId || !documents) return {previous: null as DocMeta | null, next: null as DocMeta | null};
        const current = documents.find((meta) => meta.id === docId);
        if (!current) return {previous: null, next: null};
        const section = documents.filter((meta) => (meta.section ?? '') === (current.section ?? ''));
        const index = section.findIndex((meta) => meta.id === docId);
        return {
            previous: index > 0 ? section[index - 1] : null,
            next: index >= 0 && index < section.length - 1 ? section[index + 1] : null,
        };
    }, [docId, documents]);

    const headings = useMemo(() => (content ? extractHeadings(content.markdown) : []), [content]);
    const snippetsOf = (id: string) => results?.find((result) => result.id === id)?.snippets ?? [];

    return (
        <div className="flex min-h-0 w-full flex-1">
            <aside className={cn(
                'bg-sidebar/40 flex w-72 shrink-0 flex-col border-e',
                // On a narrow screen the tree and the article take turns.
                docId ? 'max-lg:hidden' : 'max-lg:w-full',
            )}>
                <div className="flex flex-col gap-2 border-b p-3">
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t('Search documentation')}
                            className="ps-8 pe-8"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label={t('Clear')}
                                className="text-muted-foreground hover:text-foreground absolute end-2.5 top-1/2 -translate-y-1/2"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                    {Object.keys(keywordMap).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {Object.keys(keywordMap).sort().map((keyword) => (
                                <button
                                    key={keyword}
                                    type="button"
                                    onClick={() => toggleKeyword(keyword)}
                                    className={cn(
                                        'rounded-full border px-2 py-0.5 text-xs transition-colors',
                                        keywords.includes(keyword)
                                            ? 'bg-primary text-primary-foreground border-transparent'
                                            : 'hover:bg-accent',
                                    )}
                                >
                                    {keyword}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto p-2">
                    {documents === null ? (
                        <p className="text-muted-foreground px-2 py-1 text-sm">{t('Loading...')}</p>
                    ) : visible.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-1 text-sm">
                            {results ? t('Nothing found') : t('There is no documentation yet')}
                        </p>
                    ) : (
                        sections.map(([section, items]) => (
                            <div key={section} className="mb-3 flex flex-col gap-0.5">
                                {section && (
                                    <div className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase">{section}</div>
                                )}
                                {items.map((meta) => (
                                    <button
                                        key={meta.id}
                                        type="button"
                                        onClick={() => openDoc(meta.id)}
                                        className={cn(
                                            'hover:bg-accent flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-start text-sm transition-colors',
                                            meta.id === docId && 'bg-accent font-medium',
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <FileText className="text-muted-foreground size-4 shrink-0" />
                                            <span className="truncate">{meta.title}</span>
                                        </span>
                                        {snippetsOf(meta.id).slice(0, 2).map((snippet, index) => (
                                            <span key={index} className="text-muted-foreground ps-6 text-xs">{snippet}</span>
                                        ))}
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </nav>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                {!docId ? (
                    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm">
                        <BookOpen className="size-8" />
                        <span>{t('Select a document to read')}</span>
                    </div>
                ) : loading && !content ? (
                    <p className="text-muted-foreground p-6 text-sm">{t('Loading...')}</p>
                ) : error || !content ? (
                    <p className="text-muted-foreground p-6 text-sm">{t('Document not found')}</p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-ms-2 lg:hidden"
                                aria-label={t('Contents')}
                                onClick={() => router.visit(`${window.routePrefix}/docs${searchSuffix(query, keywords)}`, {preserveState: true, preserveScroll: true})}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <div className="flex min-w-0 flex-col gap-1">
                                {content.meta.section && (
                                    <span className="text-muted-foreground text-xs uppercase">{content.meta.section}</span>
                                )}
                                <h1 className="truncate text-xl font-semibold">{content.meta.title}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {(content.meta.locales?.length ?? 0) > 1 && (
                                    <div className="flex items-center gap-1">
                                        {content.meta.locales?.map((code) => (
                                            <button
                                                key={code}
                                                type="button"
                                                onClick={() => setLocale(code)}
                                                className={cn(
                                                    'rounded-full border px-2 py-0.5 text-xs uppercase transition-colors',
                                                    code === content.locale
                                                        ? 'bg-primary text-primary-foreground border-transparent'
                                                        : 'hover:bg-accent',
                                                )}
                                            >
                                                {code}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {assistantEnabled && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            openChat();
                                            sendDocToAssistant({id: content.meta.id, title: content.meta.title});
                                        }}
                                    >
                                        <Sparkles className="size-4" />
                                        {t('Send to assistant')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                                {headings.length >= 3 && (
                                    <nav className="bg-muted/30 rounded-xl border p-3 text-sm">
                                        <div className="text-muted-foreground mb-1 text-xs font-medium uppercase">{t('In this document')}</div>
                                        <ul className="flex flex-col gap-1">
                                            {headings.map((heading) => (
                                                <li key={heading.slug} className={heading.depth > 2 ? 'ps-4' : undefined}>
                                                    <a className="text-primary hover:underline" href={`#${heading.slug}`}>{heading.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </nav>
                                )}

                                <MarkdownView markdown={content.markdown} docLinks={docLinks} onDocLink={openDoc} />

                                {(siblings.previous || siblings.next) && (
                                    <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
                                        {siblings.previous ? (
                                            <Button variant="ghost" size="sm" onClick={() => openDoc(siblings.previous!.id)}>
                                                <ChevronLeft className="size-4" />
                                                {siblings.previous.title}
                                            </Button>
                                        ) : <span />}
                                        {siblings.next && (
                                            <Button variant="ghost" size="sm" onClick={() => openDoc(siblings.next!.id)}>
                                                {siblings.next.title}
                                                <ChevronRight className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

// The viewer manages its own scrolling: the tree and the article scroll apart.
export default withAppLayout(DocsPage, {className: 'overflow-hidden'});
