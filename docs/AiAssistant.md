# AI Assistant Integration

The AI assistant feature introduces a chat experience that can be toggled from the main header. It is disabled by default and can be enabled through the admin panel configuration.

## Configuration

The `AdminpanelConfig` accepts an optional `aiAssistant` section:

```ts
aiAssistant?: {
    enabled: boolean;
    defaultModel?: string;
    models?: string[];
}
```

* `enabled` — toggles the feature on or off (defaults to `false`).
* `defaultModel` — preferred model identifier that will be preselected on the client.
* `models` — list of model identifiers to register. Unknown identifiers are ignored with a warning.

### Enabling/Disabling the Assistant

When `enabled` is `false` or the `aiAssistant` section is omitted:

* The `aiAssistantHandler` will not be initialized
* No AI assistant routes will be registered
* The UI toggle for the assistant will not appear
* No AI-related access tokens will be generated

This ensures that the AI assistant subsystem has zero overhead when disabled.

#### Fixture Configuration

In the fixture, the AI assistant is disabled by default in `fixture/adminizerConfig.ts`:

```ts
aiAssistant: {
    enabled: false,
    defaultModel: 'openai-data',
    models: ['openai-data', 'dummy'],
}
```

Set `enabled: true` locally to test the assistant.

The default configuration registers the in-memory `dummy` model that always replies with `Ai-assystant dummy in deveploment`.

When the assistant is enabled, the built-in `dummy` model lets you exercise the chat locally without any external dependencies.

## Fixture OpenAI Agent

The fixture now also registers an `openai` model that executes structured commands against the database. The agent expects JSON instructions and uses `DataAccessor` under the hood, so every operation is filtered by the requesting user's permissions.

Example payload for creating a record:

```json
{
  "action": "create",
  "entity": "Example",
  "data": {
    "title": "Hello from the assistant",
    "description": "Generated through the OpenAI agent"
  }
}
```

If the user lacks the required access token (for example, `create-example-model`), the agent responds with an authorization error instead of touching the database. The `openai` fixture user (`login: openai`, `password: openai`) belongs to the administrators group, granting full access for experimentation. Regular users can be granted permissions by assigning the `ai-assistant-openai` token to their groups.

## Backend Overview

* `AiAssistantHandler` keeps registered model services and in-memory conversation history per user and model.
* Model services extend `AbstractAiModelService`, which automatically registers the corresponding access right (token pattern: `ai-assistant-<modelId>`).
* The binder (`bindAiAssistant`) attaches the handler to `Adminizer` and registers models declared in the configuration.
* `AiAssistantController` exposes REST endpoints under `/api/ai-assistant` for:
  * Listing available models (`GET /models`).
  * Fetching conversation history (`GET /history/:modelId`).
  * Sending prompts (`POST /query`).
  * Resetting history (`DELETE /history/:modelId`).

All endpoints require the user to have the access token generated for the model.

## Frontend Overview

* `AiAssistantProvider` handles fetching models/history, sending prompts, and exposing chat state via `useAiAssistant`. The provider also keeps the open state and last selected model in memory across Inertia navigations so the dialog stays available while browsing.
* `AiAssistantToggle` renders the sparkles button in the header and toggles the assistant workspace. The button displays a spinner while a request is in flight and disables itself if no models are accessible.
* `AiAssistantViewport` shifts the root application container when the assistant opens so the entire interface slides left and keeps room for the chat. On mobile devices (< 768px), the panel occupies the full screen instead of shifting content.
* `AiAssistantPanel` anchors a full-height chat interface to the right quarter of the viewport as a fixed workspace on desktop, or full-screen on mobile, rendering conversation history and the compose form outside of the main layout. Users can send messages by clicking Send or pressing Ctrl+Enter (Cmd+Enter on Mac).
* Conversation history is stored client-side for rendering while the server keeps the authoritative in-memory copy.

On mobile devices, the assistant panel uses the full screen instead of shifting the main layout.

## Extending With New Models

To register a new model:

1. Create a class that extends `AbstractAiModelService` and implement `generateReply`.
2. Add a factory entry to `modelFactories` in `bindAiAssistant.ts`.
3. Reference the new model identifier in `aiAssistant.models` within your configuration.
4. Assign the generated access token (`ai-assistant-<modelId>`) to the user groups that should have access.

## Available Models

### Dummy Model (`dummy`)

A simple development model that always returns `"Ai-assistant dummy in development"`. Useful for testing the UI without external dependencies.

### Simple OpenAI Agent (`openai`)

A JSON-based command executor that expects structured instructions:

```json
{
  "action": "create",
  "entity": "Example",
  "data": {
    "title": "Hello from the agent"
  }
}
```

This model uses `DataAccessor` for permission checks but requires manual JSON formatting. It's useful for scripted operations but not conversational.

### OpenAI Data Agent (`openai-data`)

**Recommended for production use.** A conversational AI agent powered by OpenAI's Agents API that:

* Answers questions in natural language
* Queries database models automatically using tools
* Respects user permissions through `DataAccessor`
* Maintains conversation context
* Handles complex multi-turn conversations

Example queries:
- "Show me all categories"
- "How many examples are in the database?"
- "What are the recent test records?"

## OpenAI Data Agent Setup (fixture)

The fixture ships with an `openai-data` model that demonstrates how to integrate the SDK with
OpenAI's Agents API while still relying on Adminizer's abstractions:

* The agent implementation lives in `fixture/helpers/ai/OpenAiDataAgentService.ts` and extends
  `AbstractAiModelService`.
* Database reads are performed through `DataAccessor`, which means the usual access control and field
  sanitisation rules are enforced automatically.
* Conversation history is converted into the `@openai/agents` protocol so follow-up questions can
  build on previous answers.

To enable the agent locally, set the following environment variables before starting the fixture:

```bash
export OPENAI_API_KEY="sk-..."          # required
export OPENAI_AGENT_MODEL="gpt-4.1-mini" # optional override
```

`ADMINIZER_OPENAI_KEY` can be used as an alternative variable name for the API key. When a key is
available the fixture automatically registers the model, exposes it in the assistant model list, and
prefers it as the default chat model. If the key is missing the agent stays disabled and a warning is
logged during boot.

### Configuration

In your `adminizerConfig.ts`:

```typescript
aiAssistant: {
    enabled: true,
    defaultModel: 'openai-data',  // Use conversational AI
    models: ['openai-data', 'dummy'],
}
```

**Note:** Use `'openai-data'` for natural language conversations, not `'openai'` (which is JSON-only).
