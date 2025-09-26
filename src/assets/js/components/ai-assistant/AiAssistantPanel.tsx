import {FormEvent, useEffect, useMemo, useRef, useState} from 'react';
import {Sparkles, LoaderCircle, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import clsx from 'clsx';

const PANEL_WIDTH = 'min(28rem, 25vw)';

export function AiAssistantPanel() {
    const {
        isEnabled,
        isOpen,
        closeChat,
        models,
        activeModel,
        setActiveModel,
        messages,
        loading,
        sending,
        error,
        sendMessage,
    } = useAiAssistant();
    const [input, setInput] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setInput('');
        }
    }, [isOpen]);

    const hasModels = models.length > 0;
    const helperText = useMemo(() => {
        if (loading) {
            return 'Loading conversation...';
        }
        if (!hasModels) {
            return 'No AI models are available for your account.';
        }
        if (messages.length === 0) {
            return 'Start a conversation to see responses here.';
        }
        return null;
    }, [hasModels, loading, messages.length]);

    if (!isEnabled) {
        return null;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await sendMessage(input);
        setInput('');
    };

    return (
        <div
            aria-hidden={!isOpen}
            className={clsx(
                'absolute inset-y-0 right-0 z-[60] flex max-w-full transition-transform duration-300 ease-in-out',
                isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
            )}
            style={{width: PANEL_WIDTH}}
        >
            <aside className="flex h-full w-full flex-col border-l bg-background shadow-2xl">
                <header className="flex h-16 items-center justify-between border-b px-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="size-5 text-primary"/>
                        </span>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold leading-tight">AI assistant</span>
                            <span className="text-xs text-muted-foreground">Chat with the assistant and pick a model.</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close AI assistant">
                        <X className="size-4"/>
                    </Button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
                    <Select value={activeModel} onValueChange={setActiveModel} disabled={!hasModels || loading}>
                        <SelectTrigger className="w-full" aria-label="Select AI assistant model">
                            <SelectValue placeholder={loading ? 'Loading models...' : 'Select a model'}/>
                        </SelectTrigger>
                        <SelectContent className="z-[1003]">
                            {models.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                    <div className="flex flex-col text-left">
                                        <span className="font-medium">{model.name}</span>
                                        {model.description && (
                                            <span className="text-xs text-muted-foreground">{model.description}</span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-md border">
                        <div className="flex-1 overflow-hidden">
                            <div className="flex h-full flex-col">
                                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" ref={scrollContainerRef}>
                                    {helperText && (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                            {loading && <LoaderCircle className="mr-2 size-4 animate-spin"/>}
                                            <span>{helperText}</span>
                                        </div>
                                    )}
                                    {!helperText &&
                                        messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={clsx(
                                                    'flex flex-col gap-1 rounded-md border p-3 text-sm shadow-xs',
                                                    message.role === 'assistant'
                                                        ? 'border-primary/30 bg-primary/5'
                                                        : 'border-border bg-background'
                                                )}
                                            >
                                                <span className="font-semibold">
                                                    {message.role === 'assistant' ? 'Assistant' : 'You'}
                                                </span>
                                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                        <form className="space-y-2 border-t px-4 py-3" onSubmit={handleSubmit}>
                            <Textarea
                                placeholder={hasModels ? 'Type your question...' : 'No models available'}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                disabled={!hasModels || sending}
                                rows={3}
                            />
                            <div className="flex items-center justify-between gap-3">
                                {error && <span className="text-xs text-destructive">{error}</span>}
                                <Button type="submit" disabled={!hasModels || sending || !input.trim()}>
                                    {sending ? 'Sending…' : 'Send'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export const AI_ASSISTANT_PANEL_WIDTH = PANEL_WIDTH;
