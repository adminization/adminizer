import * as fs from 'fs';
import * as path from 'path';
import {AbstractDocumentation, DocContent, DocMeta} from './AbstractDocumentation';

export interface FileDocumentationOptions {
    /** Directory scanned (recursively) for markdown documents. */
    dir: string;
    /** Locale of files without a locale suffix. @default "en" */
    defaultLocale?: string;
    /** Watch the directory and drop the cache on changes. @default false */
    watch?: boolean;
}

/**
 * One markdown source file: a translation of a document. Everything about the
 * on-disk format is a private detail of this implementation — consumers only
 * ever see `DocMeta`/`DocContent`.
 */
interface DocFile {
    locale: string;
    title: string;
    keywords: string[];
    section?: string;
    models: string[];
    urls: string[];
    accessRightsToken?: string;
    markdown: string;
}

/**
 * The reference implementation bundled with adminizer: documents are markdown
 * files with a frontmatter header, translations are sibling files with a
 * locale suffix (`intro.md` + `intro.ru.md` → document `intro` in two
 * locales). Structural metadata (bindings, rights, section) is taken from the
 * default-locale file; title and keywords are translatable per file.
 *
 * Frontmatter is an intentionally small `key: value` subset (quoted strings,
 * `[a, b]` inline lists, `- item` dash lists), not full YAML.
 */
export class FileDocumentation extends AbstractDocumentation {
    private readonly dir: string;
    private readonly defaultLocale: string;
    private cache?: Promise<Map<string, Map<string, DocFile>>>;
    private readonly changeCallbacks: Array<(ids?: string[]) => void> = [];
    private watcher?: fs.FSWatcher;
    private watchDebounce?: NodeJS.Timeout;

    constructor(options: FileDocumentationOptions) {
        super();
        this.dir = path.resolve(options.dir);
        this.defaultLocale = options.defaultLocale ?? 'en';
        if (options.watch) this.startWatcher();
    }

    public async list(locale?: string): Promise<DocMeta[]> {
        const documents = await this.scan();
        return [...documents.entries()].map(([id, translations]) => this.buildMeta(id, translations, locale));
    }

    public async get(id: string, locale?: string): Promise<DocContent | undefined> {
        const documents = await this.scan();
        const translations = documents.get(id);
        if (!translations) return undefined;
        const [servedLocale, file] = this.pickTranslation(translations, locale);
        return {
            meta: this.buildMeta(id, translations, locale),
            markdown: file.markdown,
            locale: servedLocale,
        };
    }

    public onChange(cb: (ids?: string[]) => void): void {
        this.changeCallbacks.push(cb);
    }

    /** Drops the cache; the next call rescans the directory. */
    public reload(): void {
        this.cache = undefined;
        for (const cb of this.changeCallbacks) cb();
    }

    public stopWatcher(): void {
        this.watcher?.close();
        this.watcher = undefined;
        if (this.watchDebounce) clearTimeout(this.watchDebounce);
    }

    private startWatcher(): void {
        try {
            this.watcher = fs.watch(this.dir, {recursive: true}, () => {
                if (this.watchDebounce) clearTimeout(this.watchDebounce);
                this.watchDebounce = setTimeout(() => this.reload(), 200);
            });
        } catch {
            // A missing directory or an unsupported platform degrades to a static implementation.
        }
    }

    private scan(): Promise<Map<string, Map<string, DocFile>>> {
        this.cache ??= this.scanDirectory();
        return this.cache;
    }

    private async scanDirectory(): Promise<Map<string, Map<string, DocFile>>> {
        const documents = new Map<string, Map<string, DocFile>>();
        let files: string[];
        try {
            files = (await fs.promises.readdir(this.dir, {recursive: true, withFileTypes: true}))
                .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
                .map((entry) => path.join(entry.parentPath ?? (entry as any).path, entry.name));
        } catch {
            return documents;
        }

        for (const file of files) {
            const parsed = this.parseFile(await fs.promises.readFile(file, 'utf8'), path.basename(file));
            if (!parsed) continue;
            const {id, doc} = parsed;
            const translations = documents.get(id) ?? new Map<string, DocFile>();
            translations.set(doc.locale, doc);
            documents.set(id, translations);
        }
        return documents;
    }

    /** `<id>.md` is the default locale, `<id>.<locale>.md` a translation. */
    private parseFile(raw: string, filename: string): {id: string; doc: DocFile} | undefined {
        const base = filename.replace(/\.md$/, '');
        const localeMatch = base.match(/^(.+)\.([a-z]{2}(?:-[A-Za-z]{2})?)$/);
        const fromName = localeMatch ? {id: localeMatch[1], locale: localeMatch[2]} : {id: base, locale: this.defaultLocale};

        const {front, body} = this.splitFrontmatter(raw);
        const id = (front.id as string) || fromName.id;
        if (!id) return undefined;
        return {
            id,
            doc: {
                locale: (front.locale as string) || fromName.locale,
                title: (front.title as string) || this.extractTitle(body) || id,
                keywords: this.stringList(front.keywords),
                section: (front.section as string) || undefined,
                models: this.stringList(front.models),
                urls: this.stringList(front.urls),
                accessRightsToken: (front.accessRightsToken as string) || undefined,
                markdown: body.trim(),
            },
        };
    }

    private buildMeta(id: string, translations: Map<string, DocFile>, locale?: string): DocMeta {
        const [, localized] = this.pickTranslation(translations, locale);
        const structural = translations.get(this.defaultLocale) ?? localized;
        return {
            id,
            title: localized.title,
            section: structural.section,
            keywords: localized.keywords,
            models: structural.models,
            urls: structural.urls,
            accessRightsToken: structural.accessRightsToken,
            locales: [...translations.keys()],
        };
    }

    /** Exact locale, else the default locale, else whatever exists. */
    private pickTranslation(translations: Map<string, DocFile>, locale?: string): [string, DocFile] {
        for (const wanted of [locale, this.defaultLocale]) {
            const file = wanted ? translations.get(wanted) : undefined;
            if (file) return [wanted!, file];
        }
        const [fallbackLocale, file] = [...translations.entries()][0];
        return [fallbackLocale, file];
    }

    private splitFrontmatter(raw: string): {front: Record<string, unknown>; body: string} {
        const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        if (!match) return {front: {}, body: raw};
        return {front: this.parseFrontmatter(match[1]), body: raw.slice(match[0].length)};
    }

    private parseFrontmatter(block: string): Record<string, unknown> {
        const front: Record<string, unknown> = {};
        let listKey: string | undefined;
        for (const line of block.split('\n')) {
            const dashItem = line.match(/^\s+-\s+(.*)$/);
            if (dashItem && listKey) {
                (front[listKey] as string[]).push(this.unquote(dashItem[1]));
                continue;
            }
            const pair = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
            if (!pair) continue;
            const [, key, value] = pair;
            if (value === '') {
                front[key] = [];
                listKey = key;
                continue;
            }
            listKey = undefined;
            const inlineList = value.match(/^\[(.*)]$/);
            front[key] = inlineList
                ? inlineList[1].split(',').map((item) => this.unquote(item)).filter(Boolean)
                : this.unquote(value);
        }
        return front;
    }

    private stringList(value: unknown): string[] {
        if (Array.isArray(value)) return value.map(String).filter(Boolean);
        if (typeof value === 'string' && value) return [value];
        return [];
    }

    private unquote(value: string): string {
        return value.trim().replace(/^(["'])(.*)\1$/, '$2');
    }

    private extractTitle(body: string): string | undefined {
        return body.match(/^#\s+(.+)$/m)?.[1].trim();
    }
}
