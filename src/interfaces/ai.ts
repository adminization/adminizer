import {UserAP} from "../models/UserAP";

export type AiMessageRole = 'user' | 'assistant';

export interface AiChatMessage {
    id: string;
    role: AiMessageRole;
    content: string;
    timestamp: string;
}

export interface AiModelMetadata {
    id: string;
    name: string;
    description?: string;
}

export interface AiModelResponseContext {
    user: UserAP;
    modelId: string;
    conversation: AiChatMessage[];
}

export interface AiModelResponse {
    content: string;
}
