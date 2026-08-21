import {type ComponentPropsWithoutRef, type FC, type ReactNode, isValidElement, useEffect, useId, useMemo, useState} from 'react';
import {router} from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {CheckIcon, CopyIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
import {docHref, docsApi, type DocSchemaField} from '@/lib/docs-api';
import {SchemaTable} from '@/components/docs/SchemaTable';

interface MarkdownViewProps {
    markdown: string;
    /**
     * References written inside the document that point at a readable document:
     * raw reference → document id, as resolved by the server. A reference that
     * is missing here is rendered as plain text.
     */
    docLinks?: Record<string, string>;
    /** Opens another document; without it a document reference stays plain text. */
    onDocLink?: (id: string) => void;
    className?: string;
}

/** Slug of a heading, used for in-document anchors and the mini table of contents. */
export const headingSlug = (text: string): string => text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export interface DocHeading {
    depth: number;
    title: string;
    slug: string;
}

/** Headings of a document, for the mini table of contents of a long article. */
export const extractHeadings = (markdown: string): DocHeading[] => {
    const headings: DocHeading[] = [];
    let inFence = false;
    for (const line of markdown.split('\n')) {
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;
        const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
        if (!match) continue;
        const title = match[2].replace(/[*_`]/g, '').trim();
        headings.push({depth: match[1].length, title, slug: headingSlug(title)});
    }
    return headings;
};

/** In-document references the viewer asks the server to resolve. */
export const extractDocRefs = (markdown: string): string[] => {
    const refs = new Set<string>();
    const pattern = /\]\(\s*([^)\s]+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(markdown)) !== null) {
        const ref = match[1];
        if (!ref || ref.startsWith('#') || ref.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//')) continue;
        refs.add(ref);
    }
    return [...refs];
};

const textOf = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (isValidElement<{children?: ReactNode}>(node)) return textOf(node.props.children);
    return '';
};

const isDarkTheme = (): boolean =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

const useCopyToClipboard = () => {
    const [isCopied, setIsCopied] = useState(false);
    const copy = (value: string) => {
        if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
        navigator.clipboard.writeText(value).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }, () => undefined);
    };
    return {isCopied, copy};
};

/**
 * A ```mermaid block. The library is heavy and most documents do not use it,
 * so it is only fetched when a diagram is actually rendered; a diagram that
 * fails to parse falls back to its source.
 */
const MermaidBlock: FC<{code: string}> = ({code}) => {
    const [svg, setSvg] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const id = useId().replace(/[^a-zA-Z0-9]/g, '');

    useEffect(() => {
        let cancelled = false;
        setSvg(null);
        setFailed(false);
        import('mermaid')
            .then(async ({default: mermaid}) => {
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    theme: isDarkTheme() ? 'dark' : 'default',
                });
                const rendered = await mermaid.render(`mermaid-${id}`, code);
                if (!cancelled) setSvg(rendered.svg);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [code, id]);

    if (failed) {
        return <pre className="aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-xl border p-3.5 text-[13px]">{code}</pre>;
    }
    if (!svg) {
        return <div className="bg-muted/30 text-muted-foreground my-3 rounded-xl border p-4 text-sm">…</div>;
    }
    return (
        <div
            className="my-3 flex justify-center overflow-x-auto rounded-xl border p-3 [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{__html: svg}}
        />
    );
};

/**
 * A ```schema block: either the fields written in the block itself, or the
 * structure of a model resource, fetched through the API so the reader only
 * ever sees the fields their own permissions allow.
 */
const SchemaBlock: FC<{source: string}> = ({source}) => {
    const [fields, setFields] = useState<DocSchemaField[] | null>(null);
    const [title, setTitle] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    const spec = useMemo(() => {
        try {
            const parsed = JSON.parse(source) as {model?: string; title?: string; fields?: DocSchemaField[]};
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }, [source]);

    useEffect(() => {
        if (!spec) {
            setFailed(true);
            return;
        }
        if (spec.fields) {
            setFields(spec.fields);
            setTitle(spec.title ?? null);
            return;
        }
        if (!spec.model) {
            setFailed(true);
            return;
        }

        const controller = new AbortController();
        docsApi.schema(spec.model, controller.signal)
            .then((schema) => {
                if (controller.signal.aborted) return;
                setFields(schema.fields);
                setTitle(spec.title ?? schema.title);
            })
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true);
            });
        return () => controller.abort();
    }, [spec]);

    // A block that names no model, is not valid JSON or describes a model this
    // reader may not see stays what it is in the source: a code block.
    if (failed) {
        return <pre className="aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-xl border p-3.5 text-[13px]">{source}</pre>;
    }
    return <SchemaTable className="my-3" fields={fields} title={title} loading={!fields} />;
};

const CodeBlock: FC<{language: string; code: string}> = ({language, code}) => {
    const {isCopied, copy} = useCopyToClipboard();
    return (
        <div className="my-3">
            <div className="border-border/50 bg-muted/50 flex items-center justify-between rounded-t-xl border border-b-0 px-3.5 py-1.5 text-xs">
                <span className="text-muted-foreground font-medium lowercase">{language}</span>
                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => copy(code)}
                    aria-label="Copy"
                >
                    {isCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                </button>
            </div>
            <pre className="aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
};

/**
 * The documentation renderer: GFM markdown with the panel's look, diagrams and
 * model schema blocks. It knows nothing about where a document came from — it
 * is handed markdown and the references the server was able to resolve.
 */
export function MarkdownView({markdown, docLinks = {}, onDocLink, className}: MarkdownViewProps) {
    const components = useMemo(() => ({
        h1: ({className: cls, children, ...props}: ComponentPropsWithoutRef<'h1'>) => (
            <h1 id={headingSlug(textOf(children))} className={cn('aui-md-h1 mt-6 mb-3 scroll-mt-20 text-2xl font-semibold first:mt-0', cls)} {...props}>{children}</h1>
        ),
        h2: ({className: cls, children, ...props}: ComponentPropsWithoutRef<'h2'>) => (
            <h2 id={headingSlug(textOf(children))} className={cn('aui-md-h2 mt-6 mb-2 scroll-mt-20 text-xl font-semibold first:mt-0', cls)} {...props}>{children}</h2>
        ),
        h3: ({className: cls, children, ...props}: ComponentPropsWithoutRef<'h3'>) => (
            <h3 id={headingSlug(textOf(children))} className={cn('aui-md-h3 mt-5 mb-2 scroll-mt-20 text-lg font-semibold first:mt-0', cls)} {...props}>{children}</h3>
        ),
        h4: ({className: cls, ...props}: ComponentPropsWithoutRef<'h4'>) => (
            <h4 className={cn('aui-md-h4 mt-4 mb-1.5 text-base font-medium first:mt-0', cls)} {...props} />
        ),
        p: ({className: cls, ...props}: ComponentPropsWithoutRef<'p'>) => (
            <p className={cn('aui-md-p my-3 leading-relaxed first:mt-0 last:mb-0', cls)} {...props} />
        ),
        a: ({className: cls, href, children, ...props}: ComponentPropsWithoutRef<'a'>) => {
            const raw = (href ?? '').trim();
            const linkClass = cn('aui-md-a text-primary hover:text-primary/80 underline underline-offset-2', cls);

            // An in-page anchor and an admin path behave as usual; a reference
            // to another document is only a link when the server resolved it.
            if (raw.startsWith('#')) {
                return <a className={linkClass} href={raw} {...props}>{children}</a>;
            }

            const isExternal = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//');
            if (isExternal) {
                return <a className={linkClass} href={raw} target="_blank" rel="noreferrer" {...props}>{children}</a>;
            }

            if (raw.startsWith('/')) {
                return (
                    <a
                        className={linkClass}
                        href={raw}
                        onClick={(event) => {
                            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                            event.preventDefault();
                            router.visit(raw);
                        }}
                        {...props}
                    >{children}</a>
                );
            }

            const target = docLinks[raw] ?? docLinks[raw.replace(/#.*$/, '')];
            if (!target || !onDocLink) {
                return <span className={cn('text-foreground', cls)}>{children}</span>;
            }
            return (
                <a
                    className={linkClass}
                    href={docHref(target)}
                    onClick={(event) => {
                        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                        event.preventDefault();
                        onDocLink(target);
                    }}
                    {...props}
                >{children}</a>
            );
        },
        blockquote: ({className: cls, ...props}: ComponentPropsWithoutRef<'blockquote'>) => (
            <blockquote className={cn('aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4', cls)} {...props} />
        ),
        ul: ({className: cls, ...props}: ComponentPropsWithoutRef<'ul'>) => (
            <ul className={cn('aui-md-ul marker:text-muted-foreground my-3 ms-5 list-disc [&>li]:mt-1', cls)} {...props} />
        ),
        ol: ({className: cls, ...props}: ComponentPropsWithoutRef<'ol'>) => (
            <ol className={cn('aui-md-ol marker:text-muted-foreground my-3 ms-5 list-decimal [&>li]:mt-1', cls)} {...props} />
        ),
        li: ({className: cls, ...props}: ComponentPropsWithoutRef<'li'>) => (
            <li className={cn('aui-md-li leading-relaxed', cls)} {...props} />
        ),
        hr: ({className: cls, ...props}: ComponentPropsWithoutRef<'hr'>) => (
            <hr className={cn('aui-md-hr border-muted-foreground/20 my-4', cls)} {...props} />
        ),
        table: ({className: cls, ...props}: ComponentPropsWithoutRef<'table'>) => (
            <div className="my-3 overflow-x-auto">
                <table className={cn('aui-md-table w-full border-separate border-spacing-0 text-sm', cls)} {...props} />
            </div>
        ),
        th: ({className: cls, ...props}: ComponentPropsWithoutRef<'th'>) => (
            <th className={cn('aui-md-th bg-muted px-3 py-1.5 text-start font-medium first:rounded-ss-lg last:rounded-se-lg', cls)} {...props} />
        ),
        td: ({className: cls, ...props}: ComponentPropsWithoutRef<'td'>) => (
            <td className={cn('aui-md-td border-muted-foreground/20 border-s border-b px-3 py-1.5 text-start last:border-e', cls)} {...props} />
        ),
        tr: ({className: cls, ...props}: ComponentPropsWithoutRef<'tr'>) => (
            <tr className={cn('aui-md-tr m-0 border-b p-0 first:border-t', cls)} {...props} />
        ),
        img: ({className: cls, ...props}: ComponentPropsWithoutRef<'img'>) => (
            <img className={cn('my-3 max-w-full rounded-lg border', cls)} {...props} />
        ),
        code: ({className: cls, ...props}: ComponentPropsWithoutRef<'code'>) => (
            <code className={cn('aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]', cls)} {...props} />
        ),
        // Fenced blocks are taken over here: `pre` owns the code element, so a
        // diagram or a schema replaces the block instead of being nested in it.
        pre: ({children}: ComponentPropsWithoutRef<'pre'>) => {
            const child = Array.isArray(children) ? children[0] : children;
            if (!isValidElement<{className?: string; children?: ReactNode}>(child)) {
                return <pre className="aui-md-pre border-border/50 bg-muted/30 my-3 overflow-x-auto rounded-xl border p-3.5 text-[13px]">{children}</pre>;
            }
            const language = /language-([\w-]+)/.exec(child.props.className ?? '')?.[1] ?? '';
            const code = textOf(child.props.children).replace(/\n$/, '');
            if (language === 'mermaid') return <MermaidBlock code={code} />;
            if (language === 'schema') return <SchemaBlock source={code} />;
            return <CodeBlock language={language || 'text'} code={code} />;
        },
    }), [docLinks, onDocLink]);

    return (
        <div className={cn('aui-md text-sm', className)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components as never}>{markdown}</ReactMarkdown>
        </div>
    );
}

export default MarkdownView;
