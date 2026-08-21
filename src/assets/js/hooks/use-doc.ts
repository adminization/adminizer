import {useEffect, useState} from 'react';
import {docsApi, type DocContent} from '@/lib/docs-api';
import {extractDocRefs} from '@/components/markdown-view';

interface UseDocResult {
    content: DocContent | null;
    /** Raw reference → document id, for the references this user may follow. */
    docLinks: Record<string, string>;
    loading: boolean;
    error: boolean;
}

/**
 * Loads one document together with the in-document references the server was
 * able to resolve for this user. A document that is missing or not permitted
 * comes back as an error — the viewer shows the same thing in both cases.
 */
export function useDoc(id: string | null, locale?: string): UseDocResult {
    const [content, setContent] = useState<DocContent | null>(null);
    const [docLinks, setDocLinks] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!id) {
            setContent(null);
            setDocLinks({});
            setError(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(false);

        docsApi.doc(id, locale, controller.signal)
            .then(async (doc) => {
                if (controller.signal.aborted) return;
                setContent(doc);
                const refs = extractDocRefs(doc.markdown);
                const resolved = refs.length > 0
                    ? await docsApi.resolve(doc.meta.id, refs, controller.signal).catch(() => ({}))
                    : {};
                if (!controller.signal.aborted) setDocLinks(resolved);
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setContent(null);
                    setError(true);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [id, locale]);

    return {content, docLinks, loading, error};
}
