# AI Assistant Integration

The AI assistant feature provides the shared chat UI and backend contracts for assistant models. The core package keeps the infrastructure, while concrete assistant models are enabled through an Adminizer app.

In the fixture, the implementation lives in `fixture/apps/ai-assistant` and can be enabled or disabled through `AppManager`.

## Core Responsibilities

The core keeps reusable AI infrastructure:

* `AiAssistantHandler` stores registered model services and in-memory conversation history per user and model.
* `AbstractAiModelService` defines assistant model metadata and the `generateReply()` contract.
* `AiAssistantController` exposes reusable REST handlers for listing models, reading history, sending prompts, and resetting history.
* The frontend `AiAssistantProvider`, toggle, viewport, and panel read shared config and render the chat UI.
* `AppSetupContext.aiAssistant()` lets an app attach an `AiAssistantHandler` and model services under `AppManager` lifecycle control.

The core does not auto-bind assistant routes or built-in models. There is no `bindAiAssistant` bootstrap step. Apps register routes, access rights, config patches, and models explicitly.

## Configuration

The `AdminpanelConfig` accepts an optional `aiAssistant` section:

```ts
aiAssistant?: {
    enabled: boolean;
    defaultModel?: string;
    models?: string[];
}
```

* `enabled` toggles the shared frontend assistant UI.
* `defaultModel` is the preferred model identifier preselected on the client.
* `models` is the list of model identifiers exposed by the enabled app.

The default core config is:

```ts
aiAssistant: {
    enabled: false,
}
```

Model defaults are app-owned. The core does not assume a `dummy` model.

## Fixture App

The fixture app is `fixture/apps/ai-assistant/AiAssistantApp.ts`.

It registers:

* model access tokens through `ctx.accessRight()`;
* the handler and model services through `ctx.aiAssistant()`;
* the `aiAssistant` config layer through `ctx.config()`;
* REST endpoints through `ctx.controller()`.

The app is registered in `fixture/index.ts` so `module-manager` can enable or disable it at runtime:

```ts
const aiAssistantApp = new AiAssistantApp({
    defaultModel: adminizer.config.aiAssistant?.defaultModel,
    models: adminizer.config.aiAssistant?.models ?? ["openai-data", "dummy"],
});

adminizer.appManager.register(aiAssistantApp);

if (adminizer.config.aiAssistant?.enabled) {
    await adminizer.appManager.enable(aiAssistantApp.name);
}
```

When the app is disabled, `AppManager` removes its routes, config layer, access tokens, and assistant handler.

## Fixture Configuration

In `fixture/adminizerConfig.ts`, the assistant is disabled by default:

```ts
aiAssistant: {
    enabled: false,
    defaultModel: "openai-data",
    models: ["openai-data", "dummy"],
}
```

Set `enabled: true` locally to start the fixture with the assistant app enabled. If it remains `false`, the app is still registered and can be enabled through the module manager.

## Routes

The fixture app registers these endpoints under `config.routePrefix`:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/ai-assistant/models` | List models available to the current user. |
| `GET` | `/api/ai-assistant/history/:modelId` | Fetch conversation history. |
| `POST` | `/api/ai-assistant/query` | Send a prompt to a model. |
| `DELETE` | `/api/ai-assistant/history/:modelId` | Reset conversation history. |

Each model has an access token with the pattern `ai-assistant-<modelId>`. The fixture app declares these tokens through `ctx.accessRight()`.

## Available Fixture Models

### Dummy Model (`dummy`)

A local development model with no external dependencies. It is useful for checking the UI and lifecycle behavior.

### Simple OpenAI Agent (`openai`)

A JSON-based command executor that expects structured instructions:

```json
{
  "action": "create",
  "modelResource": "Example",
  "data": {
    "title": "Hello from the agent"
  }
}
```

This model uses `DataAccessor` for permission checks, but it expects manually formatted JSON and is mostly useful for scripted experiments.

### OpenAI Data Agent (`openai-data`)

A conversational fixture model powered by OpenAI's Agents API. It can:

* answer questions in natural language;
* query Adminizer models through tools;
* create and update records through `DataAccessor`;
* respect user permissions and field-level restrictions;
* keep conversation context.

The implementation is in `fixture/apps/ai-assistant/OpenAiDataAgentService.ts`.

To enable it locally, set:

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_AGENT_MODEL="gpt-5-nano"
```

`ADMINIZER_OPENAI_KEY` can be used as an alternative API key variable. If no key is available, the fixture app skips `openai-data` and falls back to another configured model.

## Adding A Model

To add a model to the fixture app:

1. Create a class in `fixture/apps/ai-assistant` that extends `AbstractAiModelService`.
2. Implement `generateReply(prompt, history, user)`.
3. Add a model definition to `AiAssistantApp.ts`.
4. Register its access token through the app's `ctx.accessRight()` flow.
5. Add the model id to `aiAssistant.models` when it should be enabled.

Model services should not register access rights directly. The app owns tokens and lifecycle resources through `AppManager`.

## Frontend Behavior

* `AiAssistantProvider` fetches models/history, sends prompts, and exposes chat state through `useAiAssistant`.
* `AiAssistantToggle` renders the header button and is hidden when the shared `aiAssistant.enabled` config is false.
* `AiAssistantViewport` shifts the root app container on desktop and switches to a full-screen assistant on mobile.
* `AiAssistantPanel` renders model selection, history, and the compose form.

Conversation history is rendered client-side while the server keeps the authoritative in-memory copy in `AiAssistantHandler`.
