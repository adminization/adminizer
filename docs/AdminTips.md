# Admin Panel Setup Tips

- Set `routePrefix` to host the panel at a custom URL like `/adminizer` or `/dashboard`.
- Enable the dashboard only when you have widgets to display. Otherwise provide a simple welcome message via `welcome.title` and `welcome.text`.
- Configure `identifierField` and `titleField` for each model so lists and relations look clear.
- Use field groups or custom modifiers to keep long forms organized and tables readable.
- Consider writing your own widgets and controls. Register them with `WidgetHandler` and `ControlsHandler` as described in the customization guides.
