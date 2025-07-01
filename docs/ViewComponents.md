# View Components

The admin panel now exposes separate React pages for viewing model records.
These components reuse the existing forms with all inputs disabled. Custom
controls can provide dedicated read-only components by supplying a `viewPath`
option.

## Pages
- `view.tsx` – generic view page using `AddForm` in read-only mode.
- `view-user.tsx` – view page for the User model.
- `view-group.tsx` – view page for the Group model.

## Usage
Server controllers render these pages when handling the `view` action. If a
control does not provide a custom `viewPath`, the default edit control is used
with input disabled.
