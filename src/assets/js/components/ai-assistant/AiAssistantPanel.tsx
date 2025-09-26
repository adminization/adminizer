import {FormEvent, useEffect, useState} from 'react';
import {Sparkles, LoaderCircle, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import clsx from 'clsx';

interface AiAssistantPanelProps {
    width?: string;
}

export function AiAssistantPanel({width = 'min(25vw, 420px)'}: AiAssistantPanelProps) {
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

    useEffect(() => {
        if (!isOpen) {
            setInput('');
        }
    }, [isOpen]);

    const hasModels = models.length > 0;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) {
            return;
        }
        await sendMessage(trimmed);
        setInput('');
    };

    if (!isEnabled) {
        return null;
    }

    return (
        <aside
            id="ai-assistant-panel"
            aria-label="AI assistant chat"
            className={clsx(
                'bg-card text-card-foreground absolute inset-y-0 right-0 z-[60] flex h-full flex-col border-l shadow-xl transition-all duration-300 ease-in-out',
                isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
            )}
            style={{width}}
        >
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary"/>
                    <div className="flex flex-col">
                        <span className="font-semibold leading-tight">AI assistant</span>
                        <span className="text-xs text-muted-foreground">Chat with your selected model.</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close AI assistant">
                    <X className="size-4"/>
                </Button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-4">
                {!hasModels && !loading && (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        No AI models are available for your account.
                    </div>
                )}

                {hasModels && (
                    <>
                        <Select value={activeModel} onValueChange={setActiveModel}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a model"/>
                            </SelectTrigger>
                            <SelectContent className="z-[70]">
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

                        <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-md border bg-background p-4">
                            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                                {loading && (
                                    <div className="flex justify-center py-6 text-sm text-muted-foreground">
                                        Loading conversation...
                                    </div>
                                )}
                                {!loading && messages.length === 0 && (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        Start a conversation to see responses here.
                                    </div>
                                )}
                                {messages.map((message) => (
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
                            <form className="space-y-2" onSubmit={handleSubmit}>
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
                                        {sending ? (
                                            <span className="flex items-center gap-2">
                                                <LoaderCircle className="size-4 animate-spin"/>
                                                Sending…
                                            </span>
                                        ) : (
                                            'Send'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}
