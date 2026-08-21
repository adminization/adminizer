// Vendored from assistant-ui (packages/ui .../attachment.radix.tsx):
// shadcn imports resolve to adminizer's window.UIComponents (radix based).
import { type PropsWithChildren, useEffect, useState, type FC } from 'react';
import {
  XIcon,
  PlusIcon,
  BookOpen,
  FileText,
  Loader2Icon,
  AlertCircleIcon,
} from 'lucide-react';
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from '@assistant-ui/react';
import { useShallow } from 'zustand/shallow';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui/avatar';
import { TooltipIconButton } from './tooltip-icon-button';
import { t } from './i18n';
import { cn } from './utils';
import { docIdOfAttachment, isDocAttachment } from './docs-attachment';
import { openDocViewer } from '@/lib/docs-assistant';

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== 'image') return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === 'image')[0]?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt="Attachment preview"
      className={cn(
        'block h-auto max-h-[80vh] w-auto max-w-full object-contain',
        isLoaded ? 'aui-attachment-preview-image-loaded' : 'aui-attachment-preview-image-loading invisible',
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger
        className="aui-attachment-preview-trigger hover:bg-accent/50 cursor-pointer transition-colors"
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent className="aui-attachment-preview-dialog-content [&>button]:bg-foreground/60 [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive p-2 sm:max-w-3xl [&>button]:rounded-full [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0!">
        <DialogTitle className="aui-sr-only sr-only">
          Image Attachment Preview
        </DialogTitle>
        <div className="aui-attachment-preview bg-background relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const src = useAttachmentSrc();

  return (
    <Avatar className="aui-attachment-tile-avatar h-full w-full rounded-none">
      <AvatarImage
        src={src}
        alt="Attachment preview"
        className="aui-attachment-tile-image object-cover"
      />
      <AvatarFallback>
        <FileText className="aui-attachment-tile-fallback-icon text-muted-foreground size-8" />
      </AvatarFallback>
    </Avatar>
  );
};

/**
 * A knowledge base article attached to the message. It carries no file, so it
 * gets a chip of its own instead of a thumbnail tile: the label opens the
 * article in the reader, and while the attachment is still in the composer the
 * X takes it back out of the context.
 */
const DocAttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== 'message';
  const { id, name } = useAuiState(
    useShallow((s) => ({ id: s.attachment.id, name: s.attachment.name })),
  );

  return (
    <AttachmentPrimitive.Root
      className={cn(
        'aui-doc-attachment-root bg-muted/60 flex h-8 max-w-56 shrink-0 items-center gap-1 rounded-full border ps-2.5',
        isComposer ? 'pe-1' : 'pe-2.5',
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => openDocViewer(docIdOfAttachment(id))}
            className="aui-doc-attachment-open flex min-w-0 cursor-pointer items-center gap-1.5 text-xs transition-opacity hover:opacity-75"
          >
            <BookOpen className="aui-doc-attachment-icon text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <span className="aui-doc-attachment-name truncate">{name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('Open in knowledge base')}</TooltipContent>
      </Tooltip>
      {isComposer && (
        <AttachmentPrimitive.Remove asChild>
          <TooltipIconButton
            tooltip={t('Remove from context')}
            side="top"
            className="aui-doc-attachment-remove text-muted-foreground hover:[&_svg]:text-destructive size-5 rounded-full"
          >
            <XIcon className="aui-attachment-remove-icon size-3" />
          </TooltipIconButton>
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
};

const AttachmentUI: FC = () => {
  const isDoc = useAuiState((s) => isDocAttachment(s.attachment));
  return isDoc ? <DocAttachmentUI /> : <FileAttachmentUI />;
};

const FileAttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== 'message';

  const isImage = useAuiState((s) => s.attachment.type === 'image');
  const typeLabel = useAuiState((s) => {
    const type = s.attachment.type;
    switch (type) {
      case 'image':
        return 'Image';
      case 'document':
        return 'Document';
      case 'file':
        return 'File';
      default:
        return type;
    }
  });

  const uploadState = useAuiState((s) =>
    s.attachment.status.type === 'running'
      ? 'uploading'
      : s.attachment.status.type === 'incomplete' && s.attachment.status.reason === 'error'
        ? 'error'
        : undefined,
  );
  const isUploading = uploadState === 'uploading';
  const isError = uploadState === 'error';

  const errorMessage = useAuiState((s) =>
    s.attachment.status.type === 'incomplete' && s.attachment.status.reason === 'error'
      ? (s.attachment.status.message ?? 'Upload failed')
      : undefined,
  );

  return (
    <Tooltip>
      <AttachmentPrimitive.Root
        className={cn(
          'aui-attachment-root relative',
          isImage && !isComposer && 'aui-attachment-root-message only:*:first:size-24',
        )}
      >
        <AttachmentPreviewDialog>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'aui-attachment-tile bg-muted relative size-14 cursor-pointer overflow-hidden rounded-lg border transition-opacity hover:opacity-75',
                isError && 'border-destructive',
              )}
              role="button"
              tabIndex={0}
              aria-label={`${typeLabel} attachment${
                isError ? ', upload failed' : isUploading ? ', uploading' : ''
              }`}
            >
              <AttachmentThumb />
              {isUploading && (
                <div
                  aria-hidden="true"
                  className="aui-attachment-tile-uploading bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-[1px]"
                >
                  <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
                </div>
              )}
              {isError && (
                <div
                  aria-hidden="true"
                  className="aui-attachment-tile-error bg-destructive/10 absolute inset-0 flex items-center justify-center"
                >
                  <AlertCircleIcon className="text-destructive size-5" />
                </div>
              )}
            </div>
          </TooltipTrigger>
        </AttachmentPreviewDialog>
        {isComposer && <AttachmentRemove />}
      </AttachmentPrimitive.Root>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
        {errorMessage && <p className="aui-attachment-error-message">{errorMessage}</p>}
      </TooltipContent>
    </Tooltip>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <TooltipIconButton
        tooltip={t('Remove file')}
        className="aui-attachment-tile-remove text-muted-foreground hover:[&_svg]:text-destructive absolute end-1.5 top-1.5 size-3.5 rounded-full bg-white opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black"
        side="top"
      >
        <XIcon className="aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
      <MessagePrimitive.Attachments>
        {() => <AttachmentUI />}
      </MessagePrimitive.Attachments>
    </div>
  );
};

// Attached documents are chips, not thumbnails: a row of them wraps instead of
// scrolling out of reach, so every remove button stays clickable.
export const ComposerAttachments: FC = () => {
  return (
    <div className="aui-composer-attachments flex w-full flex-row flex-wrap items-center gap-2 overflow-x-auto empty:hidden">
      <ComposerPrimitive.Attachments>
        {() => <AttachmentUI />}
      </ComposerPrimitive.Attachments>
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <TooltipIconButton
        tooltip={t('Add Attachment')}
        side="bottom"
        variant="ghost"
        size="icon"
        className="aui-composer-add-attachment hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-7 rounded-full p-1 text-xs font-semibold"
        aria-label={t('Add Attachment')}
      >
        <PlusIcon className="aui-attachment-add-icon size-4.5 stroke-[1.5px]" />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};
