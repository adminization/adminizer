import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import axios from 'axios';
import {usePage} from '@inertiajs/react';
import {SharedData} from '@/types';

export interface AiAssistantMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface AiAssistantModel {
    id: string;
    name: string;
    description?: string;
}

interface AiAssistantContextValue {
    enabled: boolean;
    isOpen: boolean;
    models: AiAssistantModel[];
    selectedModelId: string | null;
    messages: AiAssistantMessage[];
    loading: boolean;
    error: string | null;
    openAssistant: () => Promise<void>;
    closeAssistant: () => void;
    selectModel: (modelId: string) => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    resetError: () => void;
}

const AiAssistantContext = createContext<AiAssistantContextValue | undefined>(undefined);

export const AiAssistantProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const page = usePage<SharedData>();
    const enabled = page.props.aiAssistant ?? false;

    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState<AiAssistantModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [messages, setMessages] = useState<AiAssistantMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        if (!enabled || models.length > 0) {
            return;
        }
        try {
            const response = await axios.get<AiAssistantModel[]>(`${window.routePrefix}/api/ai/models`);
            setModels(response.data);
            if (response.data.length > 0) {
                setSelectedModelId(response.data[0].id);
                await fetchConversation(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to load AI models', err);
            setError('Unable to load AI models.');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, models.length]);

    const fetchConversation = useCallback(async (modelId: string) => {
        if (!enabled) {
            return;
        }
        try {
            setLoading(true);
            const response = await axios.get<AiAssistantMessage[]>(`${window.routePrefix}/api/ai/conversation`, {
                params: {model: modelId},
            });
            setMessages(response.data);
        } catch (err) {
            console.error('Failed to load AI conversation', err);
            setError('Unable to load the conversation history.');
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    const openAssistant = useCallback(async () => {
        if (!enabled) {
            return;
        }
        setIsOpen(true);
        await fetchModels();
        if (selectedModelId) {
            await fetchConversation(selectedModelId);
        }
    }, [enabled, fetchModels, fetchConversation, selectedModelId]);

    const closeAssistant = useCallback(() => {
        setIsOpen(false);
    }, []);

    const selectModel = useCallback(async (modelId: string) => {
        if (!enabled) {
            return;
        }
        setSelectedModelId(modelId);
        await fetchConversation(modelId);
    }, [enabled, fetchConversation]);

    const sendMessage = useCallback(async (message: string) => {
        if (!enabled || !selectedModelId || !message.trim()) {
            return;
        }
        const optimisticMessage: AiAssistantMessage = {
            id: `local-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post<{conversation: AiAssistantMessage[]}>(
                `${window.routePrefix}/api/ai/chat`,
                {
                    modelId: selectedModelId,
                    message,
                }
            );
            setMessages(response.data.conversation);
        } catch (err) {
            console.error('Failed to send AI message', err);
            setError('Unable to send the message. Please try again.');
            setMessages(prev => prev.filter(item => item.id !== optimisticMessage.id));
        } finally {
            setLoading(false);
        }
    }, [enabled, selectedModelId]);

    const resetError = useCallback(() => setError(null), []);

    const value = useMemo(() => ({
        enabled,
        isOpen,
        models,
        selectedModelId,
        messages,
        loading,
        error,
        openAssistant,
        closeAssistant,
        selectModel,
        sendMessage,
        resetError,
    }), [enabled, isOpen, models, selectedModelId, messages, loading, error, openAssistant, closeAssistant, selectModel, sendMessage, resetError]);

    return (
        <AiAssistantContext.Provider value={value}>
            {children}
        </AiAssistantContext.Provider>
    );
};

export const useAiAssistant = (): AiAssistantContextValue => {
    const context = useContext(AiAssistantContext);
    if (!context) {
        throw new Error('useAiAssistant must be used within an AiAssistantProvider');
    }
    return context;
};
