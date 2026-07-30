import type {Adminizer} from '../Adminizer';
import type {AbstractAiModelService} from './AbstractAiModelService';
import type {User} from '../../models/User';

export interface AiConversation {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: Array<Record<string, unknown>>;
}

/**
 * Storage contract for an agent's dialogs. Applications can extend this class
 * to persist conversations in their own database instead of process memory.
 */
export abstract class AbstractAiConversationHistoryService {
    protected agent!: AbstractAiModelService;
    protected adminizer!: Adminizer;

    initialize(agent: AbstractAiModelService, adminizer: Adminizer): void {
        this.agent = agent;
        this.adminizer = adminizer;
    }

    abstract list(user: User): AiConversation[];
    abstract getActive(user: User): AiConversation;
    abstract create(user: User, title?: string): AiConversation;
    abstract select(user: User, conversationId: string): AiConversation | undefined;
    abstract remove(user: User, conversationId: string): boolean;
    abstract saveActive(user: User, messages: Array<Record<string, unknown>>, title?: string): AiConversation;
}

/** Default storage used when an agent does not provide a database-backed one. */
export class InMemoryAiConversationHistoryService extends AbstractAiConversationHistoryService {
    private readonly conversations = new Map<string, AiConversation[]>();
    private readonly activeConversationIds = new Map<string, string>();

    list(user: User): AiConversation[] {
        return [...this.getConversations(user)]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }

    getActive(user: User): AiConversation {
        const key = this.getKey(user);
        const conversations = this.getConversations(user);
        const activeId = this.activeConversationIds.get(key);
        const active = conversations.find((conversation) => conversation.id === activeId);
        if (active) return active;

        const conversation = this.create(user);
        this.activeConversationIds.set(key, conversation.id);
        return conversation;
    }

    create(user: User, title = 'New conversation'): AiConversation {
        const now = new Date().toISOString();
        const conversation: AiConversation = {
            id: `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            title,
            createdAt: now,
            updatedAt: now,
            messages: [],
        };
        this.getConversations(user).push(conversation);
        this.activeConversationIds.set(this.getKey(user), conversation.id);
        return conversation;
    }

    select(user: User, conversationId: string): AiConversation | undefined {
        const conversation = this.getConversations(user).find((item) => item.id === conversationId);
        if (conversation) this.activeConversationIds.set(this.getKey(user), conversation.id);
        return conversation;
    }

    remove(user: User, conversationId: string): boolean {
        const conversations = this.getConversations(user);
        const index = conversations.findIndex((conversation) => conversation.id === conversationId);
        if (index < 0) return false;
        conversations.splice(index, 1);
        if (this.activeConversationIds.get(this.getKey(user)) === conversationId) {
            this.activeConversationIds.delete(this.getKey(user));
        }
        return true;
    }

    saveActive(user: User, messages: Array<Record<string, unknown>>, title?: string): AiConversation {
        const conversation = this.getActive(user);
        conversation.messages = messages;
        conversation.updatedAt = new Date().toISOString();
        if (title) conversation.title = title;
        else if (conversation.title === 'New conversation') {
            const firstText = this.findFirstUserText(messages);
            if (firstText) conversation.title = firstText.slice(0, 80);
        }
        return conversation;
    }

    private getConversations(user: User): AiConversation[] {
        const key = this.getKey(user);
        let conversations = this.conversations.get(key);
        if (!conversations) {
            conversations = [];
            this.conversations.set(key, conversations);
        }
        return conversations;
    }

    private getKey(user: User): string {
        return `${user.id}:${this.agent.id}`;
    }

    private findFirstUserText(messages: Array<Record<string, unknown>>): string | undefined {
        const message = messages.find((item) => item.role === 'user');
        const content = message?.content;
        if (typeof content === 'string') return content.trim();
        if (Array.isArray(content)) {
            const text = content.find((part) => part && typeof part === 'object' && (part as {type?: string}).type === 'text') as {text?: unknown} | undefined;
            return typeof text?.text === 'string' ? text.text.trim() : undefined;
        }
        return undefined;
    }
}
