import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {usePage} from '@inertiajs/react';
import {SharedData} from '@/types';
import {adminApi} from '@/lib/admin-api';

export interface AiAssistantMessageDto {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    modelId: string;
}

export interface AiAssistantModelDto {
    id: string;
    name: string;
    description?: string;
}

interface AiAssistantContextValue {
    isEnabled: boolean;
    isOpen: boolean;
    openChat: () => void;
    closeChat: () => void;
    toggleChat: () => void;
    models: AiAssistantModelDto[];
    activeModel?: string;
    setActiveModel: (modelId: string) => void;
    messages: AiAssistantMessageDto[];
    loading: boolean;
    sending: boolean;
    error?: string | null;
    sendMessage: (message: string) => Promise<void>;
    refreshHistory: () => Promise<void>;
}

interface AiAssistantPersistedState {
    isOpen: boolean;
    activeModel?: string;
}

const getPersistedState = (): AiAssistantPersistedState | undefined => {
    if (typeof window === 'undefined') {
        return undefined;
    }
    return window.__adminizerAiAssistantState__ ?? undefined;
};

const setPersistedState = (state: AiAssistantPersistedState) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.__adminizerAiAssistantState__ = state;
};

const AiAssistantContext = createContext<AiAssistantContextValue | undefined>(undefined);

export const AiAssistantProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const page = usePage<SharedData>();
    const aiAssistantConfig = page.props.aiAssistant;
    const persisted = useMemo(() => getPersistedState(), []);
    const [isOpen, setIsOpen] = useState<boolean>(() => persisted?.isOpen ?? false);
    const [models, setModels] = useState<AiAssistantModelDto[]>([]);
    const [activeModel, setActiveModelState] = useState<string | undefined>(() =>
        persisted?.activeModel ?? aiAssistantConfig?.defaultModel ?? undefined,
    );
    const [messages, setMessages] = useState<AiAssistantMessageDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEnabled = aiAssistantConfig?.enabled ?? false;

    const fetchModels = useCallback(async () => {
        if (!isEnabled) return;
        try {
            setLoading(true);
            const {data} = await adminApi.getJson<AiAssistantModelDto[]>(`${window.routePrefix}/api/ai-assistant/models`);
            setModels(data);
            setActiveModelState((current) => {
                if (current) {
                    return current;
                }
                const defaultCandidate = aiAssistantConfig?.defaultModel && data.some((model) => model.id === aiAssistantConfig.defaultModel)
                    ? aiAssistantConfig.defaultModel
                    : data[0]?.id;
                return defaultCandidate;
            });
        } catch (err) {
            console.error('Failed to load AI assistant models', err);
            setError('Unable to load AI assistant models');
        } finally {
            setLoading(false);
        }
    }, [aiAssistantConfig?.defaultModel, isEnabled]);

    const fetchHistory = useCallback(async (modelId: string) => {
        if (!isEnabled || !modelId) return;
        try {
            setLoading(true);
            const {data} = await adminApi.getJson<{history: AiAssistantMessageDto[]}>(`${window.routePrefix}/api/ai-assistant/history/${modelId}`);
            setMessages(data.history ?? []);
        } catch (err) {
            console.error('Failed to load AI assistant history', err);
            setError('Unable to load AI assistant history');
        } finally {
            setLoading(false);
        }
    }, [isEnabled]);

    useEffect(() => {
        if (!isEnabled) {
            setMessages([]);
            return;
        }
        void fetchModels();
    }, [fetchModels, isEnabled]);

    useEffect(() => {
        if (!isEnabled || !activeModel) return;
        void fetchHistory(activeModel);
    }, [activeModel, fetchHistory, isEnabled]);

    const setActiveModel = useCallback((modelId: string) => {
        setActiveModelState(modelId);
    }, []);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);
    const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

    const sendMessage = useCallback(async (message: string) => {
        if (!isEnabled || !activeModel) return;
        const trimmed = message.trim();
        if (!trimmed) return;

        const optimisticMessage: AiAssistantMessageDto = {
            id: `tmp-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
            modelId: activeModel,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setSending(true);
        setError(null);

        try {
            const {data} = await adminApi.postJson<{history: AiAssistantMessageDto[]; modelId: string}>(
                `${window.routePrefix}/api/ai-assistant/query`,
                {modelId: activeModel, message: trimmed},
            );
            setMessages(data.history ?? []);
        } catch (err) {
            console.error('Failed to send AI assistant message', err);
            setError('Unable to reach AI assistant');
            await fetchHistory(activeModel);
        } finally {
            setSending(false);
        }
    }, [activeModel, fetchHistory, isEnabled]);

    const refreshHistory = useCallback(async () => {
        if (activeModel) {
            await fetchHistory(activeModel);
        }
    }, [activeModel, fetchHistory]);

    useEffect(() => {
        if (!isEnabled) {
            setIsOpen(false);
        }
    }, [isEnabled]);

    useEffect(() => {
        setPersistedState({
            isOpen,
            activeModel,
        });
    }, [activeModel, isOpen]);

    const value = useMemo<AiAssistantContextValue>(() => ({
        isEnabled,
        isOpen,
        openChat,
        closeChat,
        toggleChat,
        models,
        activeModel,
        setActiveModel,
        messages,
        loading,
        sending,
        error,
        sendMessage,
        refreshHistory,
    }), [
        activeModel,
        closeChat,
        error,
        isEnabled,
        isOpen,
        loading,
        messages,
        models,
        openChat,
        refreshHistory,
        sendMessage,
        sending,
        setActiveModel,
        toggleChat,
    ]);

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
