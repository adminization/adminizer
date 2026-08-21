# Knowledge Base (built-in documentation)

The **knowledge base** turns Adminizer into its own manual: articles are shown in a viewer at
`{routePrefix}/docs`, offered contextually behind an **i** button on every page, and readable by the
AI assistant — always with the reader's own access rights applied.

Where the documents live is **not** part of the feature. The only contract is the abstract class
`AbstractDocumentation`; files, a database table, an external service or generated content are all
equally valid implementations, and none of them can leak into the UI, the API or the assistant.

The feature is **opt-in twice**: it must be enabled in the config *and* an implementation must be
registered. Either one missing brings up nothing — no routes, no tokens, no navigation entry, no
assistant skills.

---

## Enabling the feature

### 1. Switch it on

```ts
const config: AdminpanelConfig = {
    documentation: {
        enabled: true,
    },
};
```

That is the whole config surface. Where documentation comes from is decided in code, not in
configuration.

### 2. Register an implementation

```ts
import {Adminizer, FileDocumentation} from 'adminizer';

await adminizer.init(config);

adminizer.documentationHandler.register(new FileDocumentation({
    dir: path.resolve(import.meta.dirname, 'documentation'),
    watch: true,
}));
```

One implementation is active per Adminizer instance. Registering a second one throws; replacing
means `unregister()` then `register()`. An app can own the implementation by passing its name as the
second argument (`register(service, appName)`), and `unregister(appName)` removes only its own.

---

## How it works

### What is brought up, and when

The wiring lives in one place — `bindDocs` — and runs the moment the feature has **both** of its
switches: `documentation.enabled: true` in the config and an implementation registered. In practice
that is inside `register()`, since the implementation arrives after `init()`; registering it at any
later point is fine too — the routes are mounted at registration, the same way the feedback
controller is. The wiring brings up:

* the base token `read-documentation` (department `documentation`);
* the viewer in the navigation, and `{routePrefix}/docs/:id` as a link template, so the assistant
  discovers both through `list_admin_navigation` and can link straight to an article;
* the three documentation skills of the assistant;
* the HTTP API `{routePrefix}/docs/api/*` and the two viewer pages.

While either switch is missing, none of that exists: no token to hand out, no navigation entry, no
skills, and a request to `{routePrefix}/docs/...` gets the same `404` as any unknown path. The one
asymmetry is a runtime `unregister()`: mounted routes cannot be unmounted, so from then on the API
answers `404` and the viewer shows an empty knowledge base until another implementation is
registered.

### A request, end to end

```text
GET {routePrefix}/docs/api/search?q=widgets
  ↓ requireAuthAPI()                     401 for an anonymous caller
  ↓ requirePermission(read-documentation) 403 without the base token
  ↓ controller                           query string → DocSearchQuery, resolves the locale
  ↓ DocumentationHandler                 calls the implementation, then drops every document
  ↓ AbstractDocumentation                this user may not read
  → JSON                                 ids, titles and bindings — nothing else
```

Three properties fall out of that order:

* **The implementation never sees a user.** It cannot forget a permission check, because it is not
  the one doing them — `DocumentationHandler` filters everything it returns.
* **Rights are re-applied per call.** The viewer, the "i" drawer, the HTTP API and the assistant all
  go through the same facade, so there is no path where a document leaks past the check — including
  link resolution, which is why an unreadable target renders as plain text.
* **Storage never leaks.** What crosses the wire is `DocMeta` and markdown; even
  `accessRightsToken` stays on the server. Nothing in the browser knows whether the article came
  from a file, a table or an HTTP call.

The viewer page is rendered with the id of the article and nothing else — the content is fetched by
the page through the same API, so a deep link, a reload and a click in the tree all follow the same
path.

### The contextual table of contents

Every Inertia response carries a `docs` shared prop: the documents bound to the current path, as
metadata only (`{count, items: [{id, title, section}]}`). It is built in `bindInertia` from
`forContextMeta(user, req.path)`, and is `null` when the subsystem is off or the user may not read
documentation.

That is what makes the "i" button work without any page knowing about documentation: the layout
renders it when the prop has entries — or when the page is a model page, which always has a schema
to show — and the drawer loads the article itself on demand. A failure inside
the implementation is logged and turns into `null` — a broken knowledge base cannot break the
pages of the panel.

### Locale

Consumers ask for a locale, they do not negotiate one. A request resolves it in this order:

1. the explicit `locale` query parameter (the locale chips in the viewer use it);
2. the reader's own locale;
3. `translation.defaultLocale` from the config.

The implementation then serves the best version it has and reports which locale that actually was,
so the viewer can show what the reader is looking at.

### Caching and freshness

The facade caches nothing: every call reaches the implementation, which is where caching belongs.
`FileDocumentation` caches its directory scan and, with `watch: true`, drops the cache when a file
changes. An implementation that can notice changes exposes `onChange`, which is how it tells
consumers to drop theirs.

---

## The contract

```ts
abstract class AbstractDocumentation {
    // Required
    abstract list(locale?: string): Promise<DocMeta[]>;
    abstract get(id: string, locale?: string): Promise<DocContent | undefined>;

    // Implemented on top of the two above; override when you can do better
    search(query: DocSearchQuery, locale?: string): Promise<DocSearchResult[]>;
    forContext(ctx: {url?: string; model?: string}, locale?: string): Promise<DocMeta[]>;
    keywords(locale?: string): Promise<Map<string, string[]>>;
    resolveLink(fromId: string, ref: string): Promise<string | undefined>;

    // Optional: tell consumers to drop their caches
    onChange?(cb: (ids?: string[]) => void): void;
}
```

`DocMeta` is everything the outside world learns about a document:

| Field                | Type       | Meaning                                                              |
|----------------------|------------|----------------------------------------------------------------------|
| `id`                 | `string`   | Stable identifier — the only handle that leaves the abstraction       |
| `title`              | `string`   | Title in the requested locale when a translation exists               |
| `section`            | `string?`  | Grouping in the viewer                                                |
| `keywords`           | `string[]` | Filter chips and the assistant's keyword map                          |
| `models`             | `string[]` | Model resources the document is about (see access rights below)       |
| `urls`               | `string[]` | Express-style admin paths (`/admin/model/:name`) the document is bound to |
| `accessRightsToken`  | `string?`  | An **existing** token required on top of the base token               |
| `locales`            | `string[]?`| Locales this document is available in                                 |

Translations are requested, never negotiated: a consumer asks for a locale and `DocContent.locale`
reports which one was actually served. Search is a property of the implementation — grep, SQL
full-text, or a vector/RAG index — and none of the consumers change when it does.

---

## Bundled implementation: `FileDocumentation`

Markdown files with a small frontmatter header; a sibling file with a locale suffix is a translation
of the same document (`intro.md` + `intro.ru.md` → document `intro` in `en` and `ru`).

```markdown
---
title: Working with data models
section: Basics
keywords: [models, records, fields]
models: [Test, Example]
urls: [/adminizer/model/:modelResourceName]
accessRightsToken: read-secret-operations-doc
---

# Working with data models

Text of the article.
```

| Option          | Default | Meaning                                              |
|-----------------|---------|------------------------------------------------------|
| `dir`           | —       | Directory scanned recursively for markdown files      |
| `defaultLocale` | `en`    | Locale of files without a suffix                      |
| `watch`         | `false` | Watch the directory and drop the cache on changes     |

Structural metadata (`section`, `models`, `urls`, `accessRightsToken`) is taken from the
default-locale file; `title` and `keywords` are translated per file. The frontmatter parser is a
deliberately small `key: value` subset (quoted strings, `[a, b]` inline lists, `- item` lists), not
full YAML — and, like everything else here, a private detail of this implementation.

Writing articles — file naming, the frontmatter keys, translations, bindings to pages and models,
links, diagrams and schema blocks — is described in
[Writing Knowledge Base Articles](KnowledgeBase/WritingArticles.md).

---

## Access rights

Implementations know nothing about users. Adminizer applies rights to every result before it reaches
the UI, the API or the assistant, so a document a reader may not open simply does not exist for
them: not in listings, not in search, not in the keyword map, and a link to it renders as plain text.

* **Base token `read-documentation`** (department `documentation`) — registered automatically when
  the feature is enabled. Without it the whole subsystem is invisible.
* **Per-document token** — the author writes `accessRightsToken: <id>` in the metadata, referring to
  a token that already exists. The subsystem never creates tokens from documents; a reference to a
  token nobody registered simply keeps the document administrator-only.
* **Model-bound documents** — a document with `models: [Test]` is visible to readers who have
  `read-Test-model` for at least one of the listed models, the very token that gates the data.

Registering a custom token is ordinary host or app code:

```ts
adminizer.accessRightsHelper.registerToken({
    id: 'read-secret-operations-doc',
    name: 'Secret operations doc',
    description: 'Access to the "Secret operations" article',
    department: 'documentation',
});
```

Administrators pass every check, as everywhere else in the panel.

---

## What users see

* **Viewer** — `{routePrefix}/docs` (and `/docs/:id`): article tree by section, keyword chips,
  full-text search with snippets, locale switcher, prev/next within a section, mini table of
  contents. Search state lives in the query string (`/docs/models-guide?q=widgets&keyword=models`),
  so any result is linkable. The viewer is also registered as a navigation entry and as an
  assistant-visible link template.
* **Contextual "i" button** — every page carries its own documentation as a shared prop, so the
  layout can offer it without the page knowing anything. `#info` opens the table of contents of the
  current page, `#info=<id>` opens one article
  (`/adminizer/model/Order#info=orders-workflow` is a valid deep link).
* **Schema tab** — on a model page the drawer also shows the structure of the model as
  `DataAccessor` reports it, so the reader sees exactly the fields their rights allow.
* **Send to assistant** — hands the *reference* to the assistant, not the text: the agent reads the
  article with the `read_documentation` skill, and the server checks the rights again. In the
  composer the article shows up as an attachment chip next to attached files — its label opens the
  article back in the reader, its X takes it out of the context, and a message carrying nothing but
  chips may still be sent.

Two fenced blocks are rendered specially in articles:

    ```mermaid
    flowchart LR
        A[List] --> B[Edit form]
    ```

    ```schema
    {"model": "Test"}
    ```

`mermaid` renders a diagram (the library is loaded only when a diagram appears); `schema` renders the
field table of a model resource — fetched through the API, so it is filtered by the reader's rights,
or written out inline (`{"title": …, "fields": [{"name", "title", "type", "required"}]}`) when it
describes something that is not a model. A block that cannot be rendered falls back to plain code.

---

## HTTP API

All endpoints require authentication and the base token; per-document rights are applied on top.

| Endpoint                                                | Returns                                   |
|---------------------------------------------------------|-------------------------------------------|
| `GET {routePrefix}/docs/api/list?locale=`                | Metadata of readable documents            |
| `GET {routePrefix}/docs/api/keywords?locale=`            | `{keyword: [docId]}`                      |
| `GET {routePrefix}/docs/api/search?q=&keywords=&url=&model=&locale=` | Results with snippets          |
| `GET {routePrefix}/docs/api/context?url=&model=`         | Documents bound to a place in the panel   |
| `GET {routePrefix}/docs/api/doc/:id?locale=`             | Markdown + metadata (`404` when not readable) |
| `GET {routePrefix}/docs/api/resolve?from=&refs=`         | In-document references → document ids     |
| `GET {routePrefix}/docs/api/schema?model=`               | Fields of a model resource for the reader |

---

## Assistant skills

When the feature is enabled, three skills are registered and carry the base token, so they can be
offered to non-administrator agents as well:

| Skill                        | Purpose                                              |
|------------------------------|------------------------------------------------------|
| `list_documentation_keywords`| Keyword map of the documents the user may read        |
| `search_documentation`       | `query` / `keywords` / `url` / `model` → snippets and ids |
| `read_documentation`         | `id` → markdown in the user's locale                  |

---

## Example: a database-backed implementation

The contract covers editable, database-stored documentation without a single change in the core:

```ts
import {AbstractDocumentation, DocContent, DocMeta} from 'adminizer';

export class DbDocumentation extends AbstractDocumentation {
    constructor(private readonly model: MyDocModel) {
        super();
    }

    async list(locale?: string): Promise<DocMeta[]> {
        const rows = await this.model.findAll({where: {published: true}});
        return rows.map((row) => ({
            id: row.slug,
            title: row.translations[locale ?? 'en']?.title ?? row.title,
            section: row.section,
            keywords: row.keywords ?? [],
            models: row.models ?? [],
            urls: row.urls ?? [],
            accessRightsToken: row.accessRightsToken ?? undefined,
            locales: Object.keys(row.translations ?? {}),
        }));
    }

    async get(id: string, locale?: string): Promise<DocContent | undefined> {
        const row = await this.model.findOne({where: {slug: id}});
        if (!row) return undefined;
        const served = locale && row.translations[locale] ? locale : 'en';
        return {
            meta: (await this.list(locale)).find((meta) => meta.id === id)!,
            markdown: row.translations[served]?.body ?? row.body,
            locale: served,
        };
    }

    // Optional: let the database do the searching instead of the default scan
    async search(query, locale) { /* … full-text query … */ }

    // Optional: drop consumer caches when an editor saves an article
    onChange(cb: () => void) { this.model.afterSave(() => cb()); }
}
```

Register it exactly like the bundled one — the viewer, the "i" button, the API and the assistant keep
working unchanged.
