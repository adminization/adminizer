import {useCallback, useEffect, useMemo, useState} from "react";
import axios from "axios";
import {Sparkles, LoaderCircle, AlertCircle} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {cn} from "@/lib/utils";

interface AssistantModel {
    id: string;
    label: string;
    description?: string;
}

interface AssistantMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
}

interface AssistantConversationResponse {
    conversationId: string;
    modelId: string;
    messages: AssistantMessage[];
}

export function AIAssistantLauncher() {
    const [open, setOpen] = useState(false);
    const [models, setModels] = useState<AssistantModel[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [prompt, setPrompt] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const assistantDescription = useMemo(() => {
        return models.find(model => model.id === selectedModel)?.description ?? "";
    }, [models, selectedModel]);

    const resetConversation = useCallback(() => {
        setConversationId(null);
        setMessages([]);
    }, []);

    const fetchModels = useCallback(async () => {
        setModelsLoading(true);
        setError(null);
        try {
            const response = await axios.get<AssistantModel[]>(`${window.routePrefix}/api/ai-assistant/models`);
            setModels(response.data);
            if (response.data.length > 0) {
                setSelectedModel(prev => prev || response.data[0].id);
            }
        } catch (err) {
            console.error("Failed to load AI assistant models", err);
            setError("Unable to load AI assistant models.");
        } finally {
            setModelsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && models.length === 0 && !modelsLoading) {
            void fetchModels();
        }
    }, [open, models.length, modelsLoading, fetchModels]);

    useEffect(() => {
        if (open) {
            return;
        }

        const timeout = setTimeout(() => {
            setPrompt("");
            setError(null);
        }, 200);

        return () => clearTimeout(timeout);
    }, [open]);

    const handleModelChange = useCallback((value: string) => {
        setSelectedModel(value);
        resetConversation();
    }, [resetConversation]);

    const handleSend = useCallback(async () => {
        if (!prompt.trim() || !selectedModel) {
            return;
        }

        setSending(true);
        setError(null);
        try {
            const response = await axios.post<AssistantConversationResponse>(
                `${window.routePrefix}/api/ai-assistant/messages`,
                {
                    modelId: selectedModel,
                    message: prompt,
                    conversationId,
                }
            );

            setConversationId(response.data.conversationId);
            setMessages(response.data.messages);
            setPrompt("");
        } catch (err) {
            console.error("Failed to send AI assistant message", err);
            setError("Unable to send a request to the AI assistant.");
        } finally {
            setSending(false);
        }
    }, [prompt, selectedModel, conversationId]);

    const canSend = prompt.trim().length > 0 && Boolean(selectedModel) && !sending;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                >
                    <Sparkles className="size-4" />
                    <span className="sr-only">Open AI assistant</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-4" />
                        AI assistant
                    </DialogTitle>
                    <DialogDescription>
                        {assistantDescription || "Select a model and describe your task to start a conversation."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="ai-assistant-model">
                            Model
                        </label>
                        <Select
                            value={selectedModel}
                            onValueChange={handleModelChange}
                            disabled={modelsLoading || models.length === 0}
                        >
                            <SelectTrigger id="ai-assistant-model">
                                <SelectValue placeholder={modelsLoading ? "Loading models..." : "Choose a model"} />
                            </SelectTrigger>
                            <SelectContent>
                                {models.map(model => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!modelsLoading && models.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No AI models are registered. Ask an administrator to enable one.
                            </p>
                        )}
                    </div>

                    <div className="h-64 rounded-md border bg-muted/40 p-3 overflow-y-auto space-y-3 text-sm">
                        {messages.length === 0 && (
                            <p className="text-muted-foreground text-center text-sm">
                                The conversation is empty. Ask the assistant for help with your task.
                            </p>
                        )}
                        {messages.map(message => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex flex-col gap-1",
                                    message.role === "user" ? "items-end" : "items-start"
                                )}
                            >
                                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                    {message.role === "user" ? "You" : "Assistant"}
                                </span>
                                <div
                                    className={cn(
                                        "rounded-md px-3 py-2",
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background border"
                                    )}
                                >
                                    {message.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="ai-assistant-input">
                            Your request
                        </label>
                        <Textarea
                            id="ai-assistant-input"
                            placeholder="Describe what you need the assistant to do"
                            rows={4}
                            value={prompt}
                            onChange={event => setPrompt(event.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="size-4" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                        Conversations are stored temporarily during this session only.
                    </div>
                    <Button type="button" onClick={handleSend} disabled={!canSend}>
                        {sending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                        Send
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
