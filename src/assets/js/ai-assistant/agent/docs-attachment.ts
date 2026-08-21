// A document handed over from the knowledge base rides the composer as a
// regular assistant-ui attachment (`CreateAttachment` — a file-less one), so
// the chip, its remove button and the "a message carrying only attachments may
// be sent" rule all come from the library instead of being re-implemented here.
//
// Only the reference travels: the text part of the attachment names the
// article, and the agent reads it itself with `read_documentation` — the
// reader's rights are checked again on the server.
import type {Attachment, CreateAttachment} from '@assistant-ui/react';
import type {AttachedDoc} from '@/lib/docs-assistant';
import {t} from './i18n';

export const DOC_ATTACHMENT_TYPE = 'documentation';
export const DOC_ATTACHMENT_CONTENT_TYPE = 'application/vnd.adminizer.documentation';

/** Attachment ids are namespaced so the same article is attached at most once. */
const ID_PREFIX = 'doc:';

type AttachmentLike = Pick<Attachment, 'id' | 'type' | 'contentType'> & {
  content?: Attachment['content'];
};

export const docAttachmentId = (docId: string): string => `${ID_PREFIX}${docId}`;

export const isDocAttachment = (attachment: Pick<AttachmentLike, 'type' | 'contentType'>): boolean =>
  attachment.type === DOC_ATTACHMENT_TYPE || attachment.contentType === DOC_ATTACHMENT_CONTENT_TYPE;

/** The document id behind an attachment produced by `createDocAttachment`. */
export const docIdOfAttachment = (attachmentId: string): string =>
  attachmentId.startsWith(ID_PREFIX) ? attachmentId.slice(ID_PREFIX.length) : attachmentId;

export function createDocAttachment(doc: AttachedDoc): CreateAttachment {
  return {
    id: docAttachmentId(doc.id),
    type: DOC_ATTACHMENT_TYPE,
    name: doc.title,
    contentType: DOC_ATTACHMENT_CONTENT_TYPE,
    content: [
      {
        type: 'text',
        text: t('Read the documentation article "{title}" (id: {id}) and use it to answer.', {
          title: doc.title,
          id: doc.id,
        }),
      },
    ],
  };
}

/**
 * The references of the documents attached to a message, in attach order. The
 * transport prepends them to the message text: attachments of this kind carry
 * no file, so they have no other way to reach the agent.
 */
export function docAttachmentReferences(attachments: readonly AttachmentLike[]): string[] {
  return attachments
    .filter((attachment) => isDocAttachment(attachment))
    .flatMap((attachment) => attachment.content ?? [])
    .filter((part): part is {type: 'text'; text: string} => part.type === 'text')
    .map((part) => part.text)
    .filter((text) => text.trim() !== '');
}
