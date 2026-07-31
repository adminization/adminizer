# AI Assistant

Adminizer ships the infrastructure for an in-panel AI assistant: a shared chat
panel, a streaming agent transport, a permission-aware skill registry and a
navigation registry the agent can search and open. Concrete agents (the classes
that talk to an LLM) are **not** part of the core — they are contributed by an
Adminizer app.

| Guide | Contents |
|---|---|
| [Building Agents](AiAssistant/BuildingAgents.md) | Write an agent service, stream a run, sessions, models, connection screens, prompts. |
| [Agent Skills](AiAssistant/AgentSkills.md) | Built-in server skills, adding your own, permissions, JSON-safe tool results. |
| [Admin Links & UI Methods](AiAssistant/AdminLinksAndUiMethods.md) | Let the agent search the navigation and open admin pages in the user's browser. |

## Architecture

```text
browser: assistant panel  ──SSE──►  AiAgentController  ──►  AbstractAiModelService (your agent)
      ▲                                                            │
      │ ui.method frames                                           │ skills / links
      └────────────────────────────────────────────────  AiAssistantAgentSkillHandler
                                                          AiAssistantUiMethodHandler
                                                          AdminLinkHandler
```

Core pieces:

| Piece | Responsibility |
|---|---|
| `AiAssistantHandler` | Registry of model services plus legacy in-memory chat history. |
| `AbstractAiModelService` | Base class of an agent: metadata, `generateReply()`, optional agent members, and the protected helpers that reach the registries below. |
| `AiAgentController` | Streaming transport: status, meta, model switching, conversations, runs. |
| `AiAssistantAgentSkillHandler` | Server-side tools (“skills”). Built-in data skills plus app-contributed ones. |
| `AiAssistantUiMethodHandler` | Browser-side capabilities the agent may trigger (`navigate`, `search-admin-links`). |
| `AdminLinkHandler` | Standalone admin pages and parametrized page templates (`/model/Test/edit/:id`). |
| Assistant panel (`src/assets/js/ai-assistant`) | Renders the thread, tool calls, model picker, connection screens, and executes `ui.method` frames. |

All four handlers are created in `Adminizer`'s constructor and are always
available as `adminizer.aiAssistantAgentSkillHandler`,
`adminizer.aiAssistantUiMethodHandler` and `adminizer.adminLinkHandler`.
`adminizer.aiAssistantHandler` is created lazily on first access, so a host
application may also register a model service directly with
`adminizer.aiAssistantHandler.registerModel(service)`.

The core does not auto-bind any model. There is no `bindAiAssistant` bootstrap
step: an app registers routes, access rights, config patches and models
explicitly.

## Configuration

`AdminpanelConfig` accepts an optional `aiAssistant` section:

```ts
aiAssistant?: {
    enabled: boolean;      // toggles the shared frontend assistant UI
    defaultModel?: string; // model id preselected on the client
    models?: string[];     // model ids exposed by the enabled app
}
```

The core default is `{enabled: false}`. Model defaults are app-owned — the core
assumes no `dummy` model.

In the fixture (`fixture/adminizerConfig.ts`) the assistant is disabled by
default; setting `enabled: true` starts the fixture with the app enabled.
Otherwise the app is still registered and can be enabled at runtime through the
module manager.

## Access rights

Every model service is guarded by the token `ai-assistant-<modelId>`. The app
that owns the service declares the token through `ctx.accessRight()`; the router
enforces it on every agent route.

Skills and links carry their own optional `accessRightsToken`, and the built-in
data skills additionally re-check `read-<model>-model` / `update-<model>-model`
on every call. See [Agent Skills](AiAssistant/AgentSkills.md#permissions).

## Routes

Registered by the core router under `config.routePrefix`:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/ai-assistant/agent/:modelId/status` | Connection state plus the UI schema (hints, commands, panels, `uiMethods`). |
| `GET` | `/api/ai-assistant/agent/:modelId/meta` | Session meta: current model, context usage, turns, model choices. |
| `GET` | `/api/ai-assistant/agent/:modelId/limits` | Provider budget / rate limits, when exposed. |
| `POST` | `/api/ai-assistant/agent/:modelId/model` | Switch the LLM inside the service. |
| `GET` | `/api/ai-assistant/agent/:modelId/history` | Messages of the active conversation. |
| `GET`/`POST` | `/api/ai-assistant/agent/:modelId/conversations` | List / create conversations. |
| `POST` | `/api/ai-assistant/agent/:modelId/conversations/:id/select` | Switch the active conversation. |
| `DELETE` | `/api/ai-assistant/agent/:modelId/conversations/:id` | Delete a conversation. |
| `POST` | `/api/ai-assistant/agent/:modelId/runs` | Start a run (prompt and/or attachments). |
| `GET` | `/api/ai-assistant/agent/:modelId/runs/:runId/stream` | SSE stream of the run. |

`GET /api/ai-assistant/models` (list of models available to the current user) is
registered by the app, not the core router — see `AiAssistantController`.

## Registering an assistant from an app

```ts
setup(ctx: AppSetupContext): void {
    ctx.accessRight({
        id: "ai-assistant-openharness",
        name: "OpenHarness data explorer",
        description: "Access to the OpenHarness agent",
        department: "AI Assistant",
    });

    ctx.aiAssistant({
        models: [(context) => new OpenHarnessDataAgentService(context)],
    });

    ctx.config({
        aiAssistant: {enabled: true, models: ["openharness"], defaultModel: "openharness"},
    });

    ctx.controller({
        id: "models",
        method: "get",
        route: "/api/ai-assistant/models",
        middleware: AiAssistantController.getModels,
        policies: [{type: "auth", mode: "api"}],
    });
}
```

Disabling the app removes its routes, config layer, access tokens, assistant
handler, skills, UI methods and admin links.

The reference implementation is `fixture/apps/ai-assistant/AiAssistantApp.ts`,
registered in `fixture/index.ts`.

## Fixture agents

| Id | Class | Notes |
|---|---|---|
| `dummy` | `DummyAiModelService` | No external dependencies; useful for checking the UI and lifecycle. |
| `openai` | `OpenAiModelService` | JSON command executor; scripted experiments only. |
| `openai-data` | `OpenAiDataAgentService` | Conversational agent on the OpenAI Agents API. Needs `OPENAI_API_KEY` (or `ADMINIZER_OPENAI_KEY`). |
| `openharness` | `OpenHarnessDataAgentService` | Streaming agent on `@openharness/core` + AI SDK. Full reference for skills, links, prompts and connection screens. Needs `OPENHARNESS_API_KEY` or `PROJECT_NAME`. |

A model whose `enabled()` check fails is skipped with a warning, and the app
falls back to `dummy`.

## Frontend behaviour

* The panel bundle (`src/assets/js/ai-assistant/agent`) renders the thread, tool
  calls, reasoning, attachments, the model picker and the connection screens.
* Everything the panel renders comes from the declarative UI schema returned by
  `getUiSchema(locale)` — the panel has no per-agent code.
* `ui.method` frames published by the agent are executed in the browser; only
  the built-in `navigate` and `search-admin-links` actions have executors, and
  `navigate` goes through the Inertia router published by the main bundle.
* Links written by the LLM in plain text are normalized with
  `resolveAdminHref()`: a guessed origin is dropped and a missing route prefix
  is restored, so a model that writes `http://localhost/model/Test` still opens
  the right admin page.
