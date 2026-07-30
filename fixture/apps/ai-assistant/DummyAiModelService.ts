import {AbstractAiModelService} from "../../../dist/lib/ai-assistant/AbstractAiModelService";
import {
    AbstractAiConversationHistoryService,
    type AiConversation,
} from "../../../dist/lib/ai-assistant/AbstractAiConversationHistoryService";
import type {AiAssistantMessage} from "../../../dist/interfaces/types";
import type {User} from "../../../dist/models/User";

const textMessage = (role: 'user' | 'assistant', text: string): Record<string, unknown> => ({
    role,
    content: [{type: 'text', text}],
});

class DummyConversationHistoryService extends AbstractAiConversationHistoryService {
    private readonly conversations = new Map<number, AiConversation[]>();
    private readonly activeIds = new Map<number, string>();

    constructor(private readonly withDemoConversations: boolean) {
        super();
    }

    list(user: User): AiConversation[] {
        return [...this.getConversations(user)].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }

    getActive(user: User): AiConversation {
        const conversations = this.getConversations(user);
        const active = conversations.find((conversation) => conversation.id === this.activeIds.get(user.id));
        if (active) return active;
        const first = conversations[0] ?? this.create(user);
        this.activeIds.set(user.id, first.id);
        return first;
    }

    create(user: User, title = 'New conversation'): AiConversation {
        const now = new Date().toISOString();
        const conversation: AiConversation = {
            id: `dummy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            createdAt: now,
            updatedAt: now,
            messages: [],
        };
        this.getConversations(user).push(conversation);
        this.activeIds.set(user.id, conversation.id);
        return conversation;
    }

    select(user: User, conversationId: string): AiConversation | undefined {
        const conversation = this.getConversations(user).find((item) => item.id === conversationId);
        if (conversation) this.activeIds.set(user.id, conversation.id);
        return conversation;
    }

    remove(user: User, conversationId: string): boolean {
        const conversations = this.getConversations(user);
        const index = conversations.findIndex((conversation) => conversation.id === conversationId);
        if (index < 0) return false;
        conversations.splice(index, 1);
        if (this.activeIds.get(user.id) === conversationId) this.activeIds.delete(user.id);
        return true;
    }

    saveActive(user: User, messages: Array<Record<string, unknown>>, title?: string): AiConversation {
        const conversation = this.getActive(user);
        conversation.messages = messages;
        conversation.updatedAt = new Date().toISOString();
        if (title) conversation.title = title;
        else if (conversation.title === 'New conversation') {
            const userMessage = messages.find((message) => message.role === 'user');
            const part = Array.isArray(userMessage?.content)
                ? userMessage.content.find((item) => (item as {type?: string})?.type === 'text') as {text?: unknown} | undefined
                : undefined;
            if (typeof part?.text === 'string' && part.text.trim()) {
                conversation.title = part.text.trim().slice(0, 80);
            }
        }
        return conversation;
    }

    private getConversations(user: User): AiConversation[] {
        let conversations = this.conversations.get(user.id);
        if (conversations) return conversations;

        conversations = this.withDemoConversations ? this.createDemoConversations() : [];
        this.conversations.set(user.id, conversations);
        if (conversations[0]) this.activeIds.set(user.id, conversations[0].id);
        return conversations;
    }

    private createDemoConversations(): AiConversation[] {
        const now = new Date().toISOString();
        return [
            {
                id: 'dummy-demo-orders',
                title: 'Order summary for today',
                createdAt: now,
                updatedAt: now,
                messages: [
                    textMessage('user', 'Show a short summary of today’s orders.'),
                    textMessage('assistant', 'Demo: 24 orders were created today. Total revenue is $1,842.'),
                ],
            },
            {
                id: 'dummy-demo-customers',
                title: 'Customers needing attention',
                createdAt: now,
                updatedAt: now,
                messages: [
                    textMessage('user', 'Which customers need attention?'),
                    textMessage('assistant', 'Demo: 3 customers have unresolved support requests and 2 have overdue invoices.'),
                ],
            },
            {
                id: 'dummy-demo-help',
                title: 'What can the assistant do?',
                createdAt: now,
                updatedAt: now,
                messages: [
                    textMessage('user', 'What can you help me with?'),
                    textMessage('assistant', 'Demo: I can answer questions, summarize data, and help test the conversation history UI.'),
                ],
            },
        ];
    }
}

export class DummyAiModelService extends AbstractAiModelService {
    constructor() {
        super({
            id: "dummy",
            name: "Dummy assistant",
            description: "Returns a simple echo response for local testing.",
        }, new DummyConversationHistoryService(process.env.DUMMY_AI_DEMO_CONVERSATIONS !== 'false'));
        this.registerChatCommand({
            id: 'hello',
            description: 'Return a greeting from the dummy agent.',
        });
    }

    async generateReply(
        prompt: string,
        _history: AiAssistantMessage[],
        user: User,
    ): Promise<string> {
        if (prompt.trim().toLowerCase() === '/hello') {
            return `Hello ${user.login}, this command was handled by the dummy agent.`;
        }
        return `Hello ${user.login}, this is a dummy AI response.`;
    }
}
