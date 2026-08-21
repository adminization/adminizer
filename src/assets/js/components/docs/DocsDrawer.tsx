import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link, router, usePage} from '@inertiajs/react';
import {ArrowLeft, BookOpen, FileText, Info, Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {SchemaTable} from '@/components/docs/SchemaTable';
import {MarkdownView} from '@/components/markdown-view';
import {useDoc} from '@/hooks/use-doc';
import {useI18n} from '@/hooks/use-i18n';
import {docsApi, type DocSchema} from '@/lib/docs-api';
import {INFO_HASH, sendDocToAssistant} from '@/lib/docs-assistant';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import type {SharedData} from '@/types';
import {cn} from '@/lib/utils';

interface InfoHashState {
    open: boolean;
    docId: string | null;
}

const readInfoHash = (): InfoHashState => {
    if (typeof window === 'undefined') return {open: false, docId: null};
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === INFO_HASH) return {open: true, docId: null};
    if (hash.startsWith(`${INFO_HASH}=`)) {
        const id = decodeURIComponent(hash.slice(INFO_HASH.length + 1));
        return {open: true, docId: id || null};
    }
    return {open: false, docId: null};
};

const writeHash = (hash: string) => {
    const {pathname, search} = window.location;
    window.history.pushState(null, '', `${pathname}${search}${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
};

/**
 * `#info` opens the contextual documentation of the page, `#info=<id>` opens a
 * document inside it — so a link from the assistant or a colleague lands on
 * exactly what was meant, on any page of the panel.
 */
const useInfoHash = (): InfoHashState => {
    const [state, setState] = useState<InfoHashState>(readInfoHash);

    useEffect(() => {
        const update = () => setState(readInfoHash());
        window.addEventListener('hashchange', update);
        window.addEventListener('popstate', update);
        const stopInertia = router.on('navigate', update);
        return () => {
            window.removeEventListener('hashchange', update);
            window.removeEventListener('popstate', update);
            stopInertia();
        };
    }, []);

    return state;
};

/** The model resource of the page, when it is one of the model pages. */
const useCurrentModel = (): string | null => {
    const page = usePage<SharedData>();
    return useMemo(() => {
        const prefix = window.routePrefix ?? '';
        const path = (page.url || window.location.pathname).split(/[?#]/)[0];
        const rest = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path;
        const match = /^\/model\/([^/]+)/.exec(rest);
        return match ? decodeURIComponent(match[1]) : null;
    }, [page.url]);
};

interface DocsDrawerProps {
    open: boolean;
    docId: string | null;
    items: Array<{id: string; title: string; section?: string}>;
    model: string | null;
    onOpenDoc: (id: string | null) => void;
    onClose: () => void;
}

function DocsDrawer({open, docId, items, model, onOpenDoc, onClose}: DocsDrawerProps) {
    const {t, locale: userLocale} = useI18n();
    const {isEnabled: assistantEnabled, openChat} = useAiAssistant();
    const [locale, setLocale] = useState<string | undefined>(undefined);
    const {content, docLinks, loading, error} = useDoc(open ? docId : null, locale ?? userLocale);
    const [schema, setSchema] = useState<DocSchema | null>(null);
    const [schemaFailed, setSchemaFailed] = useState(false);
    const [tab, setTab] = useState('docs');

    // A different document starts over in the reader's own language.
    useEffect(() => setLocale(undefined), [docId]);

    useEffect(() => {
        if (!open || !model) return;
        const controller = new AbortController();
        setSchema(null);
        setSchemaFailed(false);
        docsApi.schema(model, controller.signal)
            .then((next) => {
                if (!controller.signal.aborted) setSchema(next);
            })
            // A model this user may not read simply has no structure to show.
            .catch(() => {
                if (!controller.signal.aborted) setSchemaFailed(true);
            });
        return () => controller.abort();
    }, [model, open]);

    const sections = useMemo(() => {
        const grouped = new Map<string, typeof items>();
        for (const item of items) {
            const key = item.section ?? '';
            grouped.set(key, [...(grouped.get(key) ?? []), item]);
        }
        return [...grouped.entries()];
    }, [items]);

    // Handing a document over closes the reader, and it has to: the assistant
    // panel is a sibling of this dialog, not a child, so a modal Sheet covers it
    // with an overlay and keeps focus trapped inside — the composer would be
    // visible through the dim, and dead to both the pointer and the keyboard.
    const handedOff = useRef(false);
    const attachToAssistant = () => {
        if (!content) return;
        handedOff.current = true;
        onClose();
        openChat();
        sendDocToAssistant({id: content.meta.id, title: content.meta.title});
    };

    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
            <SheetContent
                side="right"
                className="z-[1002] w-full gap-0 p-0 sm:max-w-xl"
                onCloseAutoFocus={(event) => {
                    // Closing restores focus to the "i" button that opened this.
                    // After a hand-off the composer has already taken it, and
                    // that restore would pull it straight back out.
                    if (handedOff.current) {
                        handedOff.current = false;
                        event.preventDefault();
                    }
                }}
            >
                <SheetHeader className="border-b px-4 py-3">
                    <div className="flex items-center gap-2 pe-8">
                        {docId && (
                            <Button variant="ghost" size="icon" className="-ms-2 shrink-0" onClick={() => onOpenDoc(null)}
                                aria-label={t('Back to contents')}>
                                <ArrowLeft className="size-4" />
                            </Button>
                        )}
                        <SheetTitle className="truncate">
                            {docId ? content?.meta.title ?? t('Documentation') : t('Page documentation')}
                        </SheetTitle>
                    </div>
                    <SheetDescription className="sr-only">{t('Documentation')}</SheetDescription>
                </SheetHeader>

                <Tabs value={model ? tab : 'docs'} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
                    {model && (
                        <TabsList className="mx-4 mt-3 w-fit">
                            <TabsTrigger value="docs">{t('Documentation')}</TabsTrigger>
                            <TabsTrigger value="schema">{t('Schema')}</TabsTrigger>
                        </TabsList>
                    )}

                    <TabsContent value="docs" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                        {!docId ? (
                            items.length === 0 ? (
                                <p className="text-muted-foreground text-sm">{t('Nothing found')}</p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {sections.map(([section, sectionItems]) => (
                                        <div key={section} className="flex flex-col gap-1">
                                            {section && (
                                                <div className="text-muted-foreground px-1 text-xs font-medium uppercase">{section}</div>
                                            )}
                                            {sectionItems.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => onOpenDoc(item.id)}
                                                    className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors"
                                                >
                                                    <FileText className="text-muted-foreground size-4 shrink-0" />
                                                    <span className="truncate">{item.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : loading && !content ? (
                            <p className="text-muted-foreground text-sm">{t('Loading...')}</p>
                        ) : error || !content ? (
                            <p className="text-muted-foreground text-sm">{t('Failed to load documentation')}</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {(content.meta.locales?.length ?? 0) > 1 && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground text-xs">{t('Language')}</span>
                                        {content.meta.locales?.map((code) => (
                                            <button
                                                key={code}
                                                type="button"
                                                onClick={() => setLocale(code)}
                                                className={cn(
                                                    'rounded-full border px-2 py-0.5 text-xs uppercase transition-colors',
                                                    code === content.locale ? 'bg-primary text-primary-foreground border-transparent' : 'hover:bg-accent',
                                                )}
                                            >
                                                {code}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <MarkdownView markdown={content.markdown} docLinks={docLinks} onDocLink={onOpenDoc} />
                            </div>
                        )}
                    </TabsContent>

                    {model && (
                        <TabsContent value="schema" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                            <SchemaTable
                                fields={schema?.fields ?? (schemaFailed ? [] : null)}
                                title={schema?.title ?? model}
                                loading={!schema && !schemaFailed}
                            />
                        </TabsContent>
                    )}
                </Tabs>

                <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`${window.routePrefix}/docs${docId ? `/${encodeURIComponent(docId)}` : ''}`}>
                            <BookOpen className="size-4" />
                            {t('Open in knowledge base')}
                        </Link>
                    </Button>
                    {assistantEnabled && content && (
                        <Button variant="outline" size="sm" onClick={attachToAssistant}>
                            <Sparkles className="size-4" />
                            {t('Send to assistant')}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

/**
 * The "i" of the page header: contextual documentation of wherever the user
 * currently is. The page itself knows nothing about documentation — the
 * contextual table of contents arrives as a shared prop with every render.
 */
export function DocsInfoButton() {
    const page = usePage<SharedData>();
    const docs = page.props.docs;
    const {t} = useI18n();
    const {open, docId} = useInfoHash();
    const model = useCurrentModel();

    const openInfo = useCallback((id: string | null) => {
        writeHash(id ? `#${INFO_HASH}=${encodeURIComponent(id)}` : `#${INFO_HASH}`);
    }, []);

    const close = useCallback(() => {
        const {pathname, search} = window.location;
        window.history.pushState(null, '', `${pathname}${search}`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    if (!docs) return null;

    const items = docs.items ?? [];
    const showButton = items.length > 0 || Boolean(model);

    return (
        <>
            {showButton && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openInfo(null)}
                            aria-label={t('Page documentation')}>
                            <Info className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="z-[1002]">
                        <span>{t('Page documentation')}</span>
                    </TooltipContent>
                </Tooltip>
            )}
            <DocsDrawer
                open={open}
                docId={docId}
                items={items}
                model={model}
                onOpenDoc={openInfo}
                onClose={close}
            />
        </>
    );
}

export default DocsInfoButton;
