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

The default configuration registers the in-memory `dummy` model that always replies with `Ai-assystant dummy in deveploment`.

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

* `AiAssistantProvider` handles fetching models/history, sending prompts, and exposing chat state via `useAiAssistant`.
* `AiAssistantToggle` renders the sparkles button in the header and the chat dialog. The button displays a spinner while a request is in flight and disables itself if no models are accessible.
* Conversation history is stored client-side for rendering while the server keeps the authoritative in-memory copy.

## Extending With New Models

To register a new model:

1. Create a class that extends `AbstractAiModelService` and implement `generateReply`.
2. Add a factory entry to `modelFactories` in `bindAiAssistant.ts`.
3. Reference the new model identifier in `aiAssistant.models` within your configuration.
4. Assign the generated access token (`ai-assistant-<modelId>`) to the user groups that should have access.
