# AI Assistant Integration

The AI assistant is disabled by default and can be enabled through the Adminizer configuration. When enabled, a sparkles button appears in the header that opens a side panel chat. Operators can choose an available model and submit prompts. Responses are handled through the `/api/ai/chat` endpoint.

## Configuration

Add the following section to the Adminizer config to enable the assistant:

```ts
aiAssistant: {
    enabled: true,
    defaultModel: 'dummy',
    models: [
        {
            handler: 'relative/path/to/your/model',
            exportName: 'CustomAiModel',
            options: { /* optional model options */ }
        }
    ]
}
```

If no models are supplied, the system registers the built-in development stub (`AI Assistant Dummy`). Each model must extend the `AbstractAiModel` class and will be registered in the `AiAssistantHandler`.

## API Endpoints

- `GET /api/ai/models` — returns available models and the default selection.
- `POST /api/ai/chat` — sends a prompt to the selected model and returns the updated conversation history kept in memory for the current user.

All responses return message timestamps in ISO format so that the client can format them for display.
