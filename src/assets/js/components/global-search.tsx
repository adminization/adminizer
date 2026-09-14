import {useCallback, useEffect, useMemo, useState} from 'react';
import {router, usePage} from '@inertiajs/react';
import {Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {adminApi} from '@/lib/admin-api';
import {useI18n} from '@/hooks/use-i18n';
import type {SharedData} from '@/types';

/** One hit of `GET {routePrefix}/api/links/search` (see AdminLinkSearchResult). */
interface LinkHit {
    id: string;
    title: string;
    link?: string;
    template?: string;
    section?: string;
    description?: string;
}

const SEARCH_DEBOUNCE_MS = 200;
/** Fired by the assistant's `search-admin-links` browser action (ai-assistant/agent/runtime.ts). */
const ASSISTANT_SEARCH_EVENT = 'adminizer:ai-search-admin-links';

/**
 * Global search of the panel (Ctrl/Cmd+K). It queries the navigation registry
 * the sidebar and the assistant already use, so a user can only find pages
 * they may open. Templates (pages that need a record id) are not listed yet.
 */
export function GlobalSearch() {
    const page = usePage<SharedData>();
    const {t} = useI18n();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<LinkHit[]>([]);
    const [loading, setLoading] = useState(false);

    // Keyboard shortcut and the assistant's browser action.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
            event.preventDefault();
            setOpen((value) => !value);
        };
        const onAssistant = (event: Event) => {
            const detail = (event as CustomEvent<{query?: string}>).detail;
            setQuery(typeof detail?.query === 'string' ? detail.query : '');
            setOpen(true);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener(ASSISTANT_SEARCH_EVENT, onAssistant);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener(ASSISTANT_SEARCH_EVENT, onAssistant);
        };
    }, []);

    // Debounced request; a stale response never overwrites a newer one.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                // `getJson` resolves to an HttpResponse; the body is in `data`.
                const {data} = await adminApi.getJson<{results: LinkHit[]}>(
                    `${window.routePrefix}/api/links/search?q=${encodeURIComponent(query)}`,
                );
                // Only concrete pages can be opened from the palette.
                if (!cancelled) setHits(data.results.filter((hit) => hit.link));
            } catch {
                if (!cancelled) setHits([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [open, query]);

    const groups = useMemo(() => {
        const bySection = new Map<string, LinkHit[]>();
        for (const hit of hits) {
            const section = hit.section || 'Platform';
            if (!bySection.has(section)) bySection.set(section, []);
            bySection.get(section)!.push(hit);
        }
        return [...bySection];
    }, [hits]);

    const visit = useCallback((href: string) => {
        setOpen(false);
        router.visit(href);
    }, []);

    if (!page.props.auth?.user) return null;

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(true)}
                        aria-label={t('Search')}>
                        <Search className="size-4"/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1002]">
                    <span>{t('Search')} · Ctrl K</span>
                </TooltipContent>
            </Tooltip>
            <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}
                title={t('Search')} description={t('Search')}>
                <CommandInput value={query} onValueChange={setQuery} placeholder={`${t('Search')}…`}/>
                <CommandList>
                    <CommandEmpty>{loading ? '…' : t('Nothing found', 'Nothing found')}</CommandEmpty>
                    {groups.map(([section, items]) => (
                        <CommandGroup key={section} heading={section}>
                            {items.map((hit) => (
                                <CommandItem key={hit.id} value={hit.id} onSelect={() => visit(hit.link!)}>
                                    <span className="truncate">{hit.title}</span>
                                    {hit.description && (
                                        <span className="text-muted-foreground ml-2 truncate text-xs">{hit.description}</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}
                </CommandList>
            </CommandDialog>
        </>
    );
}
