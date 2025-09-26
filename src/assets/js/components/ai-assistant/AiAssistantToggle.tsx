import {FormEvent, useState} from 'react';
import {Sparkles, LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import clsx from 'clsx';

export function AiAssistantToggle() {
    const {
        isEnabled,
        isOpen,
        toggleChat,
        openChat,
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

    if (!isEnabled) {
        return null;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await sendMessage(input);
        setInput('');
    };

    const hasModels = models.length > 0;

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        className={clsx('relative', {'text-primary': isOpen})}
                        onClick={toggleChat}
                        disabled={!hasModels && loading}
                    >
                        {sending ? <LoaderCircle className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1002]">
                    <span>AI assistant</span>
                </TooltipContent>
            </Tooltip>

            <Dialog open={isOpen} onOpenChange={(open) => (open ? openChat() : closeChat())}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader className="gap-4 text-left">
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="size-5 text-primary"/>
                            AI assistant
                        </DialogTitle>
                        <DialogDescription>
                            Chat with the AI assistant and pick a model to process your request.
                        </DialogDescription>
                    </DialogHeader>

                    {!hasModels && !loading && (
                        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                            No AI models are available for your account.
                        </div>
                    )}

                    {hasModels && (
                        <div className="flex flex-col gap-4">
                            <Select value={activeModel} onValueChange={setActiveModel}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a model"/>
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

                            <div className="flex h-72 flex-col gap-3 overflow-hidden rounded-md border p-4">
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
                                            {sending ? 'Sending…' : 'Send'}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
