import type {AgentChatCommand} from './runtime';
import {t} from './i18n';

type CommandPickerProps = {
  commands: AgentChatCommand[];
  query: string;
  onSelect: (command: AgentChatCommand) => void;
};

/** Presentation-only picker; command execution remains on the server. */
export function CommandPicker({commands, query, onSelect}: CommandPickerProps) {
  const normalizedQuery = query.toLowerCase();
  const visibleCommands = commands.filter((command) => !normalizedQuery
    || command.id.toLowerCase().includes(normalizedQuery)
    || command.description?.toLowerCase().includes(normalizedQuery));

  return (
    <div
      role="listbox"
      aria-label={t('Commands')}
      className="aui-composer-slash-popover border-border/60 bg-popover text-popover-foreground absolute inset-x-2 bottom-full z-20 mb-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-xl border p-1 shadow-lg"
    >
      {visibleCommands.length === 0 ? (
        <div className="text-muted-foreground px-2.5 py-1.5 text-xs">{t('No matching commands')}</div>
      ) : visibleCommands.map((command) => (
        <button
          key={command.id}
          type="button"
          role="option"
          className="hover:bg-accent flex w-full cursor-pointer items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-start text-sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(command)}
        >
          <span className="font-medium">/{command.id}</span>
          {command.description && <span className="text-muted-foreground text-xs">{command.description}</span>}
        </button>
      ))}
    </div>
  );
}
