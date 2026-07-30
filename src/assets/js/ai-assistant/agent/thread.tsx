// Vendored from assistant-ui (packages/ui .../thread.tsx), trimmed for the
// OpenHarness backend: history lives in a server-side session, so branch
// picking, message editing and reload are removed (they would desync the
// server history). Dictation and follow-up suggestions are dropped too.
import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from './attachment';
import { MarkdownText } from './markdown-text';
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from './reasoning';
import { ToolFallback } from './tool-fallback';
import {
  ThoughtGroupContent,
  ThoughtGroupRoot,
  ThoughtGroupTrigger,
} from './thought-group';
import { TooltipIconButton } from './tooltip-icon-button';
import { Button } from '@/components/ui/button';
import { cn } from './utils';
import {
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useComposerRuntime,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  SquareSlashIcon,
  SquareIcon,
} from 'lucide-react';
import {useEffect, useRef, useState, type FC, type ReactNode} from 'react';
import { t } from './i18n';
import type { AgentChatCommand } from './runtime';
import {CommandPicker} from './command-picker';

// Neutral defaults: a model service that knows its domain sends its own
// prompts through the `/status` UI hints (see AgentUiHints.suggestions).
const DEFAULT_SUGGESTIONS = ['What tools are available?'];

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 && (!s.thread.isLoading || s.threads.isLoading);

export type ThreadProps = {
  /** Rendered directly under the composer (model / context / limits panels). */
  belowComposer?: ReactNode;
  /** One-liner under the welcome heading. */
  welcomeHint?: string;
  /** Composer placeholder. */
  placeholder?: string;
  /** Starter prompts shown on an empty thread; empty array hides them. */
  suggestions?: string[];
  /** Narrow single-column layout for the side panel. */
  compact?: boolean;
  /** Commands registered by the active AbstractAiModelService. */
  commands?: AgentChatCommand[];
};

export const Thread: FC<ThreadProps> = ({
  belowComposer,
  welcomeHint,
  placeholder,
  suggestions,
  compact,
  commands,
}) => {
  const isEmpty = useAuiState(isNewChatView);
  const prompts = suggestions ?? DEFAULT_SUGGESTIONS.map((key) => t(key));

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background flex h-full flex-col"
      style={{
        ['--thread-max-width' as string]: compact ? '100%' : '44rem',
        ['--composer-bg' as string]:
          'color-mix(in oklab, var(--color-muted) 30%, var(--color-background))',
        ['--composer-radius' as string]: '1.5rem',
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll overscroll-contain scroll-smooth"
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4',
            isEmpty && 'justify-center',
          )}
        >
          <AuiIf condition={isNewChatView}>
            <ThreadWelcome hint={welcomeHint} compact={compact} />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-14 flex flex-col gap-y-6 empty:hidden"
          >
            <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              'aui-thread-viewport-footer bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6',
              !isEmpty && 'sticky bottom-0 mt-auto rounded-t-(--composer-radius)',
            )}
          >
            <ThreadScrollToBottom />
            <Composer placeholder={placeholder} commands={commands} />
            {belowComposer}
            {prompts.length > 0 && (
              <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
                <ThreadSuggestions prompts={prompts} />
              </AuiIf>
            )}
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip={t('Scroll to bottom')}
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC<{ hint?: string; compact?: boolean }> = ({ hint, compact }) => {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <BotIcon className={cn('text-muted-foreground mb-3', compact ? 'size-8' : 'size-10')} />
      <h1
        className={cn(
          'aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-semibold duration-200',
          compact ? 'text-lg' : 'text-2xl',
        )}
      >
        {t('How can I help you today?')}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {hint ?? t('Ask about the data available to your account.')}
      </p>
    </div>
  );
};

const ThreadSuggestions: FC<{ prompts: string[] }> = ({ prompts }) => {
  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
      {prompts.map((prompt) => (
        <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild>
          <Button
            variant="ghost"
            className="aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
          >
            {prompt}
          </Button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

/** The picker only inserts raw command text; execution stays in the agent. */
const Composer: FC<{ placeholder?: string; commands?: AgentChatCommand[] }> = ({placeholder, commands = []}) => {
  const composerRuntime = useComposerRuntime();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerText = useAuiState((state) => state.composer.text);
  const [commandPickerOpen, setCommandPickerOpen] = useState(false);
  const [commandPickerDismissed, setCommandPickerDismissed] = useState(false);
  useEffect(() => {
    if (!composerText.trimStart().startsWith('/')) {
      setCommandPickerOpen(false);
      setCommandPickerDismissed(false);
    }
  }, [composerText]);
  const commandQuery = composerText.trimStart().startsWith('/')
    ? composerText.trimStart().slice(1).toLowerCase()
    : '';
  const showCommandPicker = commands.length > 0
    && !commandPickerDismissed
    && (commandPickerOpen || composerText.trimStart().startsWith('/'));
  const showCommands = () => {
    composerRuntime.setText('/');
    setCommandPickerOpen(true);
    setCommandPickerDismissed(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const selectCommand = (command: AgentChatCommand) => {
    composerRuntime.setText(`/${command.id} `);
    setCommandPickerOpen(false);
    setCommandPickerDismissed(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
        {showCommandPicker && <CommandPicker commands={commands} query={commandQuery} onSelect={selectCommand} />}
        <ComposerPrimitive.AttachmentDropzone asChild>
          <div
            data-slot="aui_composer-shell"
            className="border-border/60 data-[dragging=true]:border-ring focus-within:border-border dark:border-muted-foreground/15 dark:focus-within:border-muted-foreground/30 flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-2 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] data-[dragging=true]:border-dashed dark:shadow-none"
          >
            <ComposerAttachments />
            <ComposerPrimitive.Input
              ref={inputRef}
              placeholder={placeholder ?? t('Ask about your data… type / for commands')}
              className="aui-composer-input caret-primary placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
              rows={1}
              autoFocus
              addAttachmentOnPaste
              enterKeyHint="send"
              aria-label={t('Message input')}
            />
            <ComposerAction
              onShowCommands={commands.length > 0 ? showCommands : undefined}
            />
          </div>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC<{ onShowCommands?: () => void }> = ({onShowCommands}) => {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <div className="flex items-center gap-1">
        <ComposerAddAttachment />
        {onShowCommands && (
          <TooltipIconButton
            tooltip={t('Commands')}
            side="bottom"
            type="button"
            variant="ghost"
            size="icon"
            onClick={onShowCommands}
            className="size-7"
            aria-label={t('Commands')}
          >
            <SquareSlashIcon className="size-4" aria-hidden="true" />
          </TooltipIconButton>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip={t('Send message')}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-7 rounded-full"
              aria-label={t('Send message')}
            >
              <ArrowUpIcon className="aui-composer-send-icon size-4.5" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-7 rounded-full"
              aria-label={t('Stop generating')}
            >
              <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-foreground px-2 leading-relaxed wrap-break-word"
      >
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            reasoning: ['group-thought', 'group-reasoning'],
            'tool-call': ['group-thought'],
            'standalone-tool-call': [],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case 'group-thought':
                return (
                  <ThoughtGroupRoot
                    requiresAction={part.status.type === 'requires-action'}
                  >
                    <ThoughtGroupTrigger active={part.status.type === 'running'} />
                    <ThoughtGroupContent>{children}</ThoughtGroupContent>
                  </ThoughtGroupRoot>
                );
              case 'group-reasoning': {
                const running = part.status.type === 'running';
                return (
                  <ReasoningRoot variant="ghost" streaming={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case 'text':
                return <MarkdownText />;
              case 'reasoning':
                return <Reasoning {...(part as any)} />;
              case 'tool-call':
                return (part as any).toolUI ?? <ToolFallback {...(part as any)} />;
              case 'indicator':
                return (
                  <span
                    data-slot="aui_assistant-message-indicator"
                    className="animate-pulse font-sans"
                    aria-label={t('Assistant is working')}
                  >
                    {'●'}
                  </span>
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className="ms-2 flex min-h-7.5 items-center pt-1.5"
      >
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in -ms-1 flex gap-1 duration-200"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t('Copy')}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [&>*]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content bg-muted text-foreground rounded-xl px-4 py-2 wrap-break-word whitespace-pre-wrap empty:hidden">
          <MessagePrimitive.Parts />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
