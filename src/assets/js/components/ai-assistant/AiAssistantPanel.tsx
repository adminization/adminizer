import {FormEvent, useMemo, useState, type CSSProperties} from 'react';
import {Sparkles, LoaderCircle, X} from 'lucide-react';
import clsx from 'clsx';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {AI_ASSISTANT_PANEL_WIDTH} from '@/components/ai-assistant/constants';

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

    const panelStyles = useMemo<CSSProperties>(
        () => ({width: AI_ASSISTANT_PANEL_WIDTH}),
        [],
    );

    if (!isEnabled) {
        return null;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!input.trim()) {
            return;
        }
        await sendMessage(input);
        setInput('');
    };

    return (
        <>
            <div
                aria-hidden={!isOpen}
                className={clsx(
                    'pointer-events-none fixed inset-y-0 right-0 z-[1001] flex max-w-full translate-x-full transition-transform duration-300 ease-in-out',
                    isOpen && 'pointer-events-auto translate-x-0',
                )}
                style={panelStyles}
            >
                <aside className="flex h-full w-full flex-col border-l bg-background shadow-xl">
                    <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-5 text-primary"/>
                            <div className="flex flex-col">
                                <span className="text-base font-semibold leading-tight">AI assistant</span>
                                <span className="text-xs text-muted-foreground">Chat with an assistant and pick a model.</span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={closeChat}
                            aria-label="Close AI assistant"
                        >
                            <X className="size-4"/>
                        </Button>
                    </header>

                    <div className="flex flex-col gap-4 border-b px-5 pb-4 pt-3">
                        {hasModels ? (
                            <Select value={activeModel} onValueChange={setActiveModel}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a model"/>
                                </SelectTrigger>
                                <SelectContent className="z-[1002]">
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
                        ) : (
                            <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {loading ? 'Loading models…' : 'No AI models are available for your account.'}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden px-5 pb-5">
                        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                            {loading && (
                                <div className="flex justify-center py-6 text-sm text-muted-foreground">
                                    <LoaderCircle className="mr-2 size-4 animate-spin"/>
                                    Loading conversation…
                                </div>
                            )}
                            {!loading && messages.length === 0 && (
                                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
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
                                            : 'border-border bg-background',
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

                        <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
                            <Textarea
                                placeholder={hasModels ? 'Type your question…' : 'No models available'}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                disabled={!hasModels || sending}
                                rows={4}
                            />
                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                {error && <span className="text-destructive">{error}</span>}
                                <div className="ml-auto flex items-center gap-2">
                                    {sending && <LoaderCircle className="size-4 animate-spin"/>}
                                    <Button type="submit" disabled={!hasModels || sending || !input.trim()}>
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </aside>
            </div>

            <button
                type="button"
                aria-hidden={!isOpen}
                className={clsx(
                    'pointer-events-none fixed inset-0 z-[1000] cursor-default bg-transparent transition-colors duration-300 ease-in-out',
                    isOpen && 'pointer-events-auto bg-black/20',
                )}
                onClick={closeChat}
            />
        </>
    );
}
