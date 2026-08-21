import {type ComponentType, type PointerEvent, type ReactNode, useEffect, useState} from 'react';
import {LoaderCircle, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import clsx from 'clsx';

interface AiAssistantPanelProps {
    width?: string;
    isResizing?: boolean;
    onResizeStart?: (event: PointerEvent<HTMLDivElement>) => void;
}

interface AgentProps {
    routePrefix?: string;
    modelId?: string;
    title?: string;
    layout?: 'panel' | 'page';
    headerActions?: ReactNode;
}

/**
 * The chat UI itself lives in its own ES module bundle (assistant-ui + the
 * markdown stack, see vite.config.ai-assistant.ts), so it is fetched the first
 * time the panel is opened instead of weighing down the main bundle. In dev the
 * vite dev server serves the sources directly.
 */
const agentBundleUrl = (): string =>
    import.meta.env.DEV
        ? '/src/assets/js/ai-assistant/agent/index.tsx'
        // The entry name is intentionally stable (hard-coded import sites, no
        // manifest), so the version query is the only cache-busting it gets.
        // It has to be the *runtime* version bindInertia puts on the page: the
        // release pipeline bumps the version only after vite has already run,
        // so a build-time constant would be the same string in every release.
        : `${window.routePrefix ?? ''}/assets/ai-assistant/agent.es.js?v=${window.adminizerVersion ?? ''}`;

export function AiAssistantPanel({width = 'min(25vw, 420px)', isResizing = false, onResizeStart}: AiAssistantPanelProps) {
    const {
        isEnabled,
        isOpen,
        closeChat,
        models,
        activeModel,
        setActiveModel,
        loading,
        error,
    } = useAiAssistant();

    const [Agent, setAgent] = useState<ComponentType<AgentProps> | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load on first open and keep it mounted afterwards: closing the panel
    // should not throw away the thread.
    useEffect(() => {
        if (!isOpen || Agent || loadError) {
            return;
        }

        let cancelled = false;
        import(/* @vite-ignore */ agentBundleUrl())
            .then((module) => {
                if (!cancelled) {
                    setAgent(() => module.default as ComponentType<AgentProps>);
                }
            })
            .catch((err) => {
                console.error('Failed to load the AI assistant UI', err);
                if (!cancelled) {
                    setLoadError('Unable to load the AI assistant UI');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [Agent, isOpen, loadError]);

    if (!isEnabled) {
        return null;
    }

    const activeMeta = models.find((model) => model.id === activeModel);
    const closeButton = (
        <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close AI assistant">
            <X className="size-4"/>
        </Button>
    );

    // Several registered assistants are rare, so the switch only shows up then.
    const headerActions = (
        <>
            {models.length > 1 && (
                <Select value={activeModel} onValueChange={setActiveModel}>
                    <SelectTrigger className="h-8 w-36 text-xs" aria-label="Select assistant">
                        <SelectValue placeholder="Assistant"/>
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                        {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                                {model.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {closeButton}
        </>
    );

    return (
        <aside
            id="ai-assistant-panel"
            aria-label="AI assistant chat"
            aria-hidden={!isOpen}
            className={clsx(
                'bg-card text-card-foreground fixed bottom-0 right-0 top-0 z-[60] flex h-full flex-col border-l shadow-xl transition-all duration-300 ease-in-out',
                'md:w-auto w-full',
                isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none',
                isResizing && 'transition-none'
            )}
            style={{width: 'var(--ai-assistant-panel-actual-width, ' + width + ')'}}
        >
            <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize AI assistant panel"
                className="absolute -left-2 top-0 z-10 hidden h-full w-4 cursor-col-resize touch-none md:block"
                onPointerDown={onResizeStart}
            />
            {activeModel && Agent && !loadError ? (
                <Agent
                    key={activeModel}
                    routePrefix={window.routePrefix ?? ''}
                    modelId={activeModel}
                    title={activeMeta?.name}
                    layout="panel"
                    headerActions={headerActions}
                />
            ) : (
                <>
                    <div className="flex items-center justify-between border-b px-3 py-2">
                        <span className="font-semibold leading-tight">AI assistant</span>
                        {closeButton}
                    </div>
                    <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                        {loadError || error ? (
                            <span className="text-destructive">{loadError ?? error}</span>
                        ) : !loading && models.length === 0 ? (
                            <span>No AI models are available for your account.</span>
                        ) : (
                            <LoaderCircle className="size-8 animate-spin"/>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
}
