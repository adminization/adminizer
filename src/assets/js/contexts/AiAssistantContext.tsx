import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {usePage} from '@inertiajs/react';
import {SharedData} from '@/types';
import {adminApi} from '@/lib/admin-api';

export interface AiAssistantModelDto {
    id: string;
    name: string;
    description?: string;
}

/**
 * Panel-level state only: which assistant is selected and whether the panel is
 * open. The conversation itself lives in the agent bundle and, behind it, in
 * the per-user server session (see AiAgentController), so nothing about
 * messages is kept here.
 */
interface AiAssistantContextValue {
    isEnabled: boolean;
    isOpen: boolean;
    openChat: () => void;
    closeChat: () => void;
    toggleChat: () => void;
    models: AiAssistantModelDto[];
    activeModel?: string;
    setActiveModel: (modelId: string) => void;
    loading: boolean;
    error?: string | null;
}

interface AiAssistantPersistedState {
    isOpen: boolean;
    activeModel?: string;
}

const ASSISTANT_STATE_STORAGE_KEY = 'adminizer.aiAssistant.state';

const getPersistedState = (): AiAssistantPersistedState | undefined => {
    if (typeof window === 'undefined') {
        return undefined;
    }

    try {
        const storedState = window.localStorage.getItem(ASSISTANT_STATE_STORAGE_KEY);
        if (storedState) {
            const state = JSON.parse(storedState) as Partial<AiAssistantPersistedState>;
            if (typeof state.isOpen === 'boolean') {
                return {
                    isOpen: state.isOpen,
                    activeModel: typeof state.activeModel === 'string' ? state.activeModel : undefined,
                };
            }
        }
    } catch {
        // Storage can be unavailable in private browsing mode.
    }

    return window.__adminizerAiAssistantState__ ?? undefined;
};

const setPersistedState = (state: AiAssistantPersistedState) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.__adminizerAiAssistantState__ = state;

    try {
        window.localStorage.setItem(ASSISTANT_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage can be unavailable in private browsing mode.
    }
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEnabled = aiAssistantConfig?.enabled ?? false;

    const fetchModels = useCallback(async () => {
        if (!isEnabled) return;
        try {
            setLoading(true);
            const {data} = await adminApi.getJson<AiAssistantModelDto[]>(`${window.routePrefix}/api/ai-assistant/models`);
            setModels(data);
            setActiveModelState((current) => {
                if (current && data.some((model) => model.id === current)) {
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

    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        void fetchModels();
    }, [fetchModels, isEnabled]);

    const setActiveModel = useCallback((modelId: string) => {
        setActiveModelState(modelId);
    }, []);

    const openChat = useCallback(() => setIsOpen(true), []);
    const closeChat = useCallback(() => setIsOpen(false), []);
    const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

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
        loading,
        error,
    }), [
        activeModel,
        closeChat,
        error,
        isEnabled,
        isOpen,
        loading,
        models,
        openChat,
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
