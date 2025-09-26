import {AIAssistantMessageRole} from "../types/ai";

export interface AIAssistantMessage {
    id: string;
    role: AIAssistantMessageRole;
    content: string;
    createdAt: string;
}

export interface AIAssistantConversation {
    id: string;
    modelId: string;
    userId: number | null;
    messages: AIAssistantMessage[];
}

export interface AIAssistantModelSummary {
    id: string;
    label: string;
    description?: string;
}
