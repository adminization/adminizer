import {FormEvent, useEffect, useMemo, useRef, useState} from 'react';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog.tsx';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select.tsx';
import {Textarea} from '@/components/ui/textarea.tsx';
import {Button} from '@/components/ui/button.tsx';
import {AlertCircle, LoaderCircle} from 'lucide-react';
import clsx from 'clsx';

export function AiAssistantPanel() {
    const {
        isOpen,
        closeAssistant,
        models,
        selectedModelId,
        selectModel,
        messages,
        sendMessage,
        loading,
        error,
        resetError,
    } = useAiAssistant();

    const [input, setInput] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages, loading]);

    useEffect(() => {
        if (!isOpen) {
            setInput('');
        }
    }, [isOpen]);

    const currentModel = useMemo(() => models.find(model => model.id === selectedModelId), [models, selectedModelId]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) {
            return;
        }
        await sendMessage(trimmed);
        setInput('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                closeAssistant();
            }
        }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-4">
                <DialogHeader>
                    <DialogTitle>AI Assistant</DialogTitle>
                    <DialogDescription>
                        Interact with the available AI models to get help with your tasks.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium leading-none">Model</span>
                            <span className="text-xs text-muted-foreground">
                                {currentModel?.description ?? 'Select a model to start the conversation.'}
                            </span>
                        </div>
                        <Select
                            value={selectedModelId ?? ''}
                            onValueChange={(value) => selectModel(value)}
                            disabled={models.length <= 1}
                        >
                            <SelectTrigger className="sm:w-64">
                                <SelectValue placeholder="Choose a model" />
                            </SelectTrigger>
                            <SelectContent>
                                {models.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto rounded-md border bg-muted/40 p-4"
                    >
                        {messages.length === 0 && !loading ? (
                            <p className="text-sm text-muted-foreground text-center">
                                Start the conversation by sending the first message.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={clsx(
                                            'flex flex-col gap-1 rounded-lg border p-3 text-sm shadow-sm',
                                            message.role === 'assistant'
                                                ? 'bg-background'
                                                : 'bg-primary/10 border-primary/30'
                                        )}
                                    >
                                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            {message.role === 'assistant' ? 'Assistant' : 'You'}
                                        </span>
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">
                                            {message.content}
                                        </p>
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        <span>Waiting for the assistant...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                            <Button variant="ghost" size="sm" className="ml-auto" onClick={resetError}>
                                Dismiss
                            </Button>
                        </div>
                    )}

                    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
                        <Textarea
                            value={input}
                            onChange={(event) => {
                                if (error) {
                                    resetError();
                                }
                                setInput(event.target.value);
                            }}
                            placeholder="Ask the assistant anything..."
                            rows={3}
                        />
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="submit"
                                disabled={!input.trim() || loading || !selectedModelId}
                            >
                                Send
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
