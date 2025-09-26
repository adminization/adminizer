export type AiMessageRole = 'user' | 'assistant';

export interface AiMessage {
    id: string;
    role: AiMessageRole;
    content: string;
    createdAt: Date;
}

export interface AiConversation {
    id: string;
    userId: number;
    modelId: string;
    messages: AiMessage[];
    updatedAt: Date;
}

export interface AiModelSummary {
    id: string;
    name: string;
    description?: string;
}
