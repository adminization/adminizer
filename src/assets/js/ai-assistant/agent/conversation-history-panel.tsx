import {PlusIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from './utils';
import type {ConversationSummary} from './runtime';

type ConversationHistoryPanelProps = {
  conversations: ConversationSummary[];
  activeConversationId: string;
  disabled?: boolean;
  onCreate: () => void;
  onSelect: (conversationId: string) => void;
};

export function ConversationHistoryPanel({
  conversations, activeConversationId, disabled, onCreate, onSelect,
}: ConversationHistoryPanelProps) {
  return (
    <aside className="absolute inset-x-0 bottom-0 top-12 z-20 flex flex-col border-b bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Conversation history</span>
        <Button variant="ghost" size="sm" className="gap-1" onClick={onCreate} disabled={disabled}>
          <PlusIcon className="size-4" /> New
        </Button>
      </div>
      <div data-ai-assistant-history className="flex-1 overflow-y-auto p-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
              conversation.id === activeConversationId && 'bg-accent font-medium',
            )}
          >
            <span className="block truncate">{conversation.title}</span>
            <span className="text-muted-foreground block text-xs">{new Date(conversation.updatedAt).toLocaleString()}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
