import {FormEvent, useMemo, useState} from 'react';
import {Sparkles, X, LoaderCircle} from 'lucide-react';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import clsx from 'clsx';

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

    const hasModels = models.length > 0;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!hasModels || sending) {
            return;
        }
        const trimmed = input.trim();
        if (!trimmed) {
            return;
        }
        await sendMessage(trimmed);
        setInput('');
    };

    const panelWidth = useMemo(() => (isOpen ? '25%' : '0px'), [isOpen]);

    if (!isEnabled) {
        return null;
    }

    return (
        <aside
            className={clsx(
                'relative flex h-full flex-col border-l bg-background shadow-lg transition-[width] duration-300 ease-in-out',
                {'pointer-events-none': !isOpen}
            )}
            style={{width: panelWidth, minWidth: panelWidth}}
            aria-hidden={!isOpen}
        >
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary"/>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">AI assistant</span>
                            <span className="text-xs text-muted-foreground">Chat with Adminizer AI models</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close AI assistant">
                        <X className="size-4"/>
                    </Button>
                </div>

                <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
                    <div className="space-y-2">
                        <span className="text-xs font-medium uppercase text-muted-foreground">Model</span>
                        <Select value={activeModel} onValueChange={setActiveModel} disabled={!hasModels || loading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model"/>
                            </SelectTrigger>
                            <SelectContent>
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
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3">
                        {!hasModels && !loading && (
                            <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                                No AI models are available for your account.
                            </div>
                        )}
                        <div className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3 pr-1">
                            {loading && (
                                <div className="flex justify-center py-6 text-sm text-muted-foreground">
                                    Loading conversation...
                                </div>
                            )}
                            {!loading && messages.length === 0 && (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground text-center">
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
                                <Button type="submit" disabled={!hasModels || sending || !input.trim()} className="min-w-20">
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
                </div>
            </div>
        </aside>
    );
}
