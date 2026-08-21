/**
 * The hand-off of a document to the AI assistant. Only the reference travels:
 * the agent reads the document itself with the `read_documentation` skill, so
 * the user's rights are re-checked on the server and the conversation is not
 * padded with text the agent may not need.
 *
 * The panel is a lazily loaded bundle, so the reference is also parked on the
 * window: a panel that mounts after the click picks it up on start.
 */

export const ATTACH_DOC_EVENT = 'adminizer:ai-attach-doc';

export interface AttachedDoc {
    id: string;
    title: string;
}

export function sendDocToAssistant(doc: AttachedDoc): void {
    window.__adminizerAttachDoc__ = doc;
    window.dispatchEvent(new CustomEvent<AttachedDoc>(ATTACH_DOC_EVENT, {detail: doc}));
}

/** Consumes the parked reference, if the panel was not listening yet. */
export function takeAttachedDoc(): AttachedDoc | undefined {
    const doc = window.__adminizerAttachDoc__;
    window.__adminizerAttachDoc__ = undefined;
    return doc;
}

/** The hash the documentation reader lives behind, on any page of the panel. */
export const INFO_HASH = 'info';

/**
 * Opens a document in the reader over the current page. The way back from a
 * reference the assistant holds to the article itself — the assistant panel is
 * a separate bundle, so the two sides meet on the hash, not on an import.
 */
export function openDocViewer(id: string): void {
    const {pathname, search} = window.location;
    window.history.pushState(null, '', `${pathname}${search}#${INFO_HASH}=${encodeURIComponent(id)}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
}
