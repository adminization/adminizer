import {useEffect, useMemo, useState} from 'react';
import axios from 'axios';
import {Button} from "@/components/ui/button.tsx";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Loader2, Send, Sparkles} from "lucide-react";
import {usePage} from "@inertiajs/react";
import {SharedData} from "@/types";

interface AiAssistantMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

interface AiModelSummary {
    id: string;
    name: string;
    description?: string;
}

export function AiAssistantLauncher() {
    const page = usePage<SharedData>();
    const aiConfig = page.props.aiAssistant;

    const [open, setOpen] = useState(false);
    const [models, setModels] = useState<AiModelSummary[]>(aiConfig?.models ?? []);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelId, setModelId] = useState<string | undefined>(aiConfig?.defaultModel ?? aiConfig?.models?.[0]?.id);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [messages, setMessages] = useState<AiAssistantMessage[]>([]);
    const [input, setInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeModel = useMemo(() => models.find((model) => model.id === modelId), [models, modelId]);

    useEffect(() => {
        if (!open || models.length > 0) {
            return;
        }
        let isMounted = true;
        const loadModels = async () => {
            setLoadingModels(true);
            try {
                const {data} = await axios.get(`${window.routePrefix}/api/ai/models`);
                if (!isMounted) return;
                setModels(data.models ?? []);
                setModelId((current) => current ?? data.defaultModel ?? data.models?.[0]?.id);
            } catch (err) {
                console.error('Failed to load AI models', err);
                if (isMounted) {
                    setError('Unable to load AI models right now.');
                }
            } finally {
                if (isMounted) {
                    setLoadingModels(false);
                }
            }
        };
        loadModels();
        return () => {
            isMounted = false;
        };
    }, [open, models.length]);

    const resetConversation = () => {
        setConversationId(undefined);
        setMessages([]);
        setError(null);
    };

    const handleModelChange = (value: string) => {
        setModelId(value);
        resetConversation();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!input.trim() || !modelId) {
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const {data} = await axios.post(`${window.routePrefix}/api/ai/chat`, {
                message: input,
                modelId,
                conversationId,
            });
            setConversationId(data.conversationId);
            setMessages(data.messages ?? []);
            setInput('');
        } catch (err) {
            console.error('Failed to submit AI request', err);
            setError('The assistant is unavailable. Please try again later.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!aiConfig?.enabled) {
        return null;
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Open AI assistant"
                >
                    <Sparkles className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-lg w-full p-0">
                <SheetHeader className="border-b bg-muted/40">
                    <div className="flex items-center justify-between gap-2">
                        <SheetTitle>AI Assistant</SheetTitle>
                        <Select value={modelId} onValueChange={handleModelChange} disabled={loadingModels || submitting || models.length === 0}>
                            <SelectTrigger className="min-w-[160px]">
                                <SelectValue placeholder="Select model" />
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
                    {activeModel?.description && (
                        <p className="text-muted-foreground text-sm">
                            {activeModel.description}
                        </p>
                    )}
                </SheetHeader>
                <div className="flex h-full flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                        {messages.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Start a conversation to get help from the assistant.
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex flex-col gap-1 ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}
                                >
                                    <span className="text-xs text-muted-foreground">
                                        {message.role === 'assistant' ? 'Assistant' : 'You'} · {new Date(message.createdAt).toLocaleTimeString()}
                                    </span>
                                    <div
                                        className={`max-w-full rounded-lg px-3 py-2 text-sm shadow-sm ${
                                            message.role === 'assistant'
                                                ? 'bg-muted text-muted-foreground'
                                                : 'bg-primary text-primary-foreground'
                                        }`}
                                    >
                                        {message.content}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {error && (
                        <div className="px-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <SheetFooter className="border-t bg-background">
                        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
                            <Textarea
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder={loadingModels ? 'Loading models…' : 'Ask me anything about the admin panel…'}
                                disabled={submitting || loadingModels || models.length === 0}
                                className="min-h-[120px]"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    Responses are generated by the selected AI model.
                                </span>
                                <Button type="submit" disabled={submitting || loadingModels || !input.trim() || !modelId}>
                                    {submitting ? (
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                    ) : (
                                        <Send className="mr-2 size-4" />
                                    )}
                                    Send
                                </Button>
                            </div>
                        </form>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}
