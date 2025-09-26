# AI Assistant Integration

The admin panel now ships with an optional AI assistant that can be launched from the header bar via the ✨ sparkles button. The assistant is disabled by default and must be enabled explicitly in the Adminizer configuration.

## Enabling the assistant

Add the `aiAssistant` flag to your admin panel configuration (for example in `config/adminpanel.js`):

```ts
module.exports = {
  aiAssistant: {
    enabled: true,
  },
};
```

Once enabled, Adminizer boots the AI assistant handler during startup and registers the built-in dummy model. Additional models can be registered through the handler API in custom bindings.

## Backend architecture

The backend exposes a lightweight abstraction for AI models:

- `AbstractAIModel` – base class that encapsulates how a model generates responses.
- `AIAssistantHandler` – central registry that stores model instances and in-memory conversation history.
- `DummyAIModel` – development placeholder that always returns the `"AI-assistant dummy in development"` response.

New models can extend `AbstractAIModel` and be registered inside a custom binding using `adminizer.aiAssistantHandler.registerModel(model)`.

### API endpoints

When the assistant is enabled the router exposes two endpoints under the configured route prefix:

| Method | Endpoint                                | Description                              |
|--------|------------------------------------------|------------------------------------------|
| GET    | `/api/ai-assistant/models`               | Returns the list of registered AI models. |
| POST   | `/api/ai-assistant/messages`             | Sends a prompt to the selected model and returns the updated conversation history. |

Requests to `/api/ai-assistant/messages` accept a JSON body with `modelId`, `message`, and an optional `conversationId`. The response includes the full conversation with all messages accumulated in memory for the current session.

## Front-end behaviour

When the assistant is enabled the header renders a sparkles icon button. Clicking it opens a dialog that allows administrators to:

1. Select an AI model.
2. Review the current conversation history.
3. Submit new prompts.

Conversations are stored only in-memory. Closing the dialog keeps the history until the page is refreshed. Model descriptions are shown to help administrators understand the capabilities of each model.

## Limitations

- The default dummy model only returns a fixed placeholder response.
- Conversations are not persisted. Restarting the server or refreshing the page clears the history.
- The assistant respects existing admin policies because all API routes are registered through the Adminizer policy manager.
