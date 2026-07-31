# Building Agents

An agent is a class extending `AbstractAiModelService`. The app that owns it
registers it through `ctx.aiAssistant({models: [...]})`; everything the panel
shows is derived from what the class implements.

There are two levels of capability:

1. **Plain chat model** — implement `generateReply()` only. The panel runs it
   through the same streaming transport and renders the answer as one text part.
2. **Streaming agent** — also implement `streamReply()`. The panel then renders
   tool calls, reasoning, attachments, a server-side per-user session, model
   switching, conversations and connection screens. Whatever you do not
   implement is simply not rendered, so partial implementations are fine.

## Minimal agent

```ts
import {AbstractAiModelService} from "adminizer";
import type {AiAssistantMessage} from "adminizer";
import type {User} from "adminizer";

export class MyAgentService extends AbstractAiModelService {
    constructor() {
        super({
            id: "my-agent",
            name: "My agent",
            description: "Answers questions about this panel.",
        });
    }

    public async generateReply(prompt: string, history: AiAssistantMessage[], user: User): Promise<string> {
        return `You said: ${prompt}`;
    }
}
```

Register it and its access token from the app:

```ts
ctx.accessRight({
    id: "ai-assistant-my-agent",
    name: "My agent",
    description: "Access to My agent",
    department: "AI Assistant",
});
ctx.aiAssistant({models: [() => new MyAgentService()]});
```

`attachAdminizer()` is called on registration, so `this.adminizer` and every
protected helper below are available from the first call onwards — never in the
constructor.

## Streaming a run

```ts
public async streamReply(
    input: string | Array<Record<string, unknown>>,
    user: User,
    publish: AiAgentPublish,
): Promise<void> {
    const session = await this.getSession(user);
    for await (const event of session.send(input)) publish(event as AiAgentStreamEvent);
}
```

`input` is the plain prompt, or an AI-SDK-style `ModelMessage[]` when the user
attached files. The closing `done` frame is emitted by the run manager, not by
the service.

Frame types the panel understands:

| `type` | Meaning |
|---|---|
| `text.delta` / `text.done` | Assistant text. |
| `reasoning.delta` / `reasoning.done` | Reasoning block. |
| `tool.start` / `tool.done` / `tool.error` | A tool call and its result. |
| `ui.method` | Ask the browser to perform a registered UI method — see [Admin Links & UI Methods](AdminLinksAndUiMethods.md). |
| `step.done` / `turn.done` | Carry `usage` for the token counter. |
| `error` | Turn failed. |

## Optional agent members

Implement only what your runtime supports.

| Member | Effect |
|---|---|
| `getSessionMeta(user)` | Model, context window, turn count, context tokens, total usage in the panel header. |
| `getSessionHistory(user)` | Session as `ModelMessage[]`; the panel rebuilds the thread from it. |
| `restoreSessionHistory(user, messages)` | Load a stored dialog when the user switches conversations. |
| `resetSession(user)` | Drop the session; returns whether there was anything to drop. |
| `compactSession(user)` | Summarize/prune the session. Its presence auto-registers the `/compact` command. |
| `getModelChoices()` / `setCurrentModel(user, model)` | Both present ⇒ the panel shows the model picker. |
| `saveUploadedFiles(user, files)` | Persist uploads before the turn, so tools can refer to them by id. |
| `getConnectionStatus()` | Provisioning state. Present and not `ready` ⇒ the panel shows a connection screen instead of the composer. |
| `getLimits(forceRefresh)` | Present ⇒ the panel shows the limits panel. |
| `getUiHints(locale)` | Panel copy for this service. |

## UI schema

`getUiSchema(locale)` is what the panel consumes. The base implementation merges
`getUiHints(locale)` with the registered commands and the derived `panels`
flags; `AiAgentController` adds the user's `uiMethods` on top. Override it only
if you need something the hints cannot express.

```ts
public getUiHints(locale?: string): AiAgentUiHints {
    return {
        title: this.name,
        welcomeHint: "Ask about the data available to your account.",
        composerPlaceholder: "Ask about your data… type / for commands",
        suggestions: ["What can you do?"],
    };
}
```

The locale comes from the admin user, so an agent can localize its own copy.
The panel runs strings through its own dictionary first, so English source
strings it already knows are still translated.

## Slash commands

```ts
this.registerChatCommand(
    {id: "summarize", description: "Summarize the conversation."},
    async ({arguments: args, user, publish}) => ({text: await this.summarize(user, args)}),
);
```

The panel only displays commands and sends the raw `/command arguments` text
back — command handling never lives in the browser. A handler should **return**
text rather than publishing a text frame itself, so the response is persisted in
the conversation. Returning nothing lets the command fall through to
`streamReply`/`generateReply` as normal input. Set `persist: false` for
ephemeral commands that must not enter history.

If `compactSession()` exists and no `compact` command was registered, `/compact`
is added automatically.

## Connection screens

Agents that need provisioning report it through `getConnectionStatus()`
(`registering`, `waiting_retry`, `setup_required`, `error`, `ready`) and describe
each screen declaratively through `ui.connectionScreens`:

```ts
public getUiHints(locale?: string): AiAgentUiHints {
    return {
        connectionScreens: {
            registering: {
                title: "Connecting the assistant…",
                description: "The assistant registers itself with the LLM gateway.",
                icon: "spinner",
            },
            waiting_retry: {
                title: "Waiting for the next registration slot",
                icon: "spinner",
                details: [
                    {field: "nextAttemptAt", label: "Next attempt at", format: "local-time"},
                    {field: "lastError", tone: "error"},
                ],
            },
            setup_required: {
                title: "Server setup required",
                description: "Set the PROJECT_NAME setting to finish the server setup.",
                icon: "bot",
                action: {label: "PROJECT_NAME", href: "/settings/PROJECT_NAME"},
            },
        },
    };
}
```

* `details[].field` reads a field of the connection status object, so an agent
  chooses which status values are worth showing.
* `format: "local-time"` renders an ISO timestamp in the viewer's timezone.
* `action.href` is normalized with `resolveAdminHref()`, so an admin-relative
  path is enough.
* A `default` screen covers any state without its own entry.
* Agents that set none of this keep the legacy behaviour driven by
  `setupSetting` / `setupUrl`.

## System prompts in files

Keeping prompts out of the code makes them reviewable and swappable per model.
The fixture stores them in `fixture/apps/ai-assistant/prompts/*.txt` and composes
`common.txt` + an agent prompt + a per-model prompt, substituting `{{value}}`
placeholders:

```text
prompts/
  common.txt                          # safety and tool-use rules shared by every agent
  openharness.txt                     # agent prompt, uses {{active_user}}, {{available_tools}}
  openharness-model-default.txt       # fallback per-model prompt
  openharness-model-genius.txt        # picked when the provider model id slugifies to "genius"
```

```ts
instructions: loadSystemPrompt(["openharness", this.getModelPromptName(choice.id)], {
    active_provider_model: choice.id,
    active_user: this.describeUser(user).login,
    available_tools: availableTools,
}),
```

The per-model file is chosen by slugifying the provider model id and falling
back to `…-model-default.txt` when no file matches.

## Model choices

`getModelChoices()` returns the LLMs a user may switch between. Fetching them
from the provider keeps the list honest — an OpenAI-compatible gateway scopes
`GET /models` to the caller's key — but must be cached, because the panel asks
for metadata often:

```ts
private modelCatalogCache: {fetchedAt: number; models: ModelChoice[]} | null = null;
```

The fixture caches for three minutes and drops the cache whenever the connection
changes, so a new key or permission change is picked up without hitting the
proxy on every request. Always keep a fallback choice for the case where the
catalogue request fails.

## Sessions

A streaming agent usually keeps one provider session per user. Two rules from
the fixture are worth copying:

* **Fingerprint the credentials.** Store `${baseUrl}:${apiKey}` on the session
  and rebuild it when it changes, so a rotated key never reuses a stale session.
* **Normalize the history.** Tool results are stored verbatim in the message
  history and re-validated on every later turn. One `Date` from an ORM record
  poisons the whole session, and every subsequent turn dies with
  `Invalid prompt: The messages do not match the ModelMessage[] schema`. Pass
  results through `toJsonSafe()` — `executeAgentSkill()` already does — and
  repair sessions written to by MCP servers or subagents:

```ts
session.messages = toJsonSafe(session.messages ?? []);
```

## Giving the agent tools

Do not hand-write data tools. Adminizer exposes provider-neutral skills (JSON
Schema + an `execute` callback) that already apply the calling user's
permissions:

```ts
const skills = this.getAgentSkills(user);
const skillTools = Object.fromEntries(skills.map((skill) => [skill.id, tool({
    description: skill.description,
    inputSchema: jsonSchema(skill.inputSchema),
    execute: async (input: Record<string, unknown>) => this.executeAgentSkill(skill.id, input, user),
})]));
```

See [Agent Skills](AgentSkills.md) for the built-ins and for contributing your
own, and [Admin Links & UI Methods](AdminLinksAndUiMethods.md) for navigation.

## Protected helpers on `AbstractAiModelService`

| Helper | Purpose |
|---|---|
| `getAgentSkills(user)` | Skill descriptors this user may call, permissions applied. |
| `executeAgentSkill(id, input, user)` | Run a skill and return a JSON-safe result. |
| `describeUser(user)` | Plain identity of the user (login, name, groups, administrator flag). |
| `getUiMethods(user)` | Browser capabilities available to this user. |
| `searchAdminLinks(user, query)` | Server-side implementation of `search-admin-links`. |
| `openAdminLink(target, user, publish)` | Validate a link or template and publish a `navigate` frame; returns the resolved URL. |
| `publishUiMethod(id, input, user, publish)` | Publish any registered UI method after its permission check. |

## Checklist

1. Extend `AbstractAiModelService` and implement `generateReply()`.
2. Add `streamReply()` plus whichever optional members your runtime supports.
3. Build tools from `getAgentSkills(user)` instead of writing data access by hand.
4. Return copy through `getUiHints(locale)`; describe provisioning through
   `getConnectionStatus()` + `connectionScreens`.
5. Register the model factory and the `ai-assistant-<id>` token from the app.
6. Add the id to `aiAssistant.models`.

Model services must not register access rights themselves — the app owns tokens
and lifecycle resources through `AppManager`.
