# AI Assistant Integration

The admin panel header now includes access to an AI assistant that opens in a modal dialog. The feature is disabled by default and can be enabled through the admin panel configuration.

## Configuration

```ts
aiAssistant: {
    enabled: true,
}
```

When enabled, the system registers an `AiAssistantHandler` and loads the bundled `DummyAiModel`. Additional models can be implemented by extending `AbstractAiModel` and registering them on the handler.

## API Endpoints

When the assistant is enabled the following endpoints become available under the configured `routePrefix`:

- `GET /api/ai/models` – returns the list of registered models.
- `GET /api/ai/conversation?model=<id>` – returns the in-memory conversation history for the user and model.
- `POST /api/ai/chat` – sends a message to the assistant and returns the updated conversation.

All responses are scoped to the authenticated user and conversation history is stored only in memory.

## Front-end Behaviour

- The header displays a sparkles (✨) icon button when the assistant is enabled.
- Clicking the button opens a dialog that allows the user to pick a model and exchange messages.
- Messages are posted to `/api/ai/chat` and the assistant currently responds with the dummy string `Ai-assystant dummy in deveploment`.

The front-end uses `AiAssistantProvider` to keep the chat state and expose it throughout the application layout.
