# Development Runtime

## Adminizer development mode

`adminizer` no longer uses the shared `VITE_ENV` variable to decide whether its own assets should run through the Vite dev server.

Use `ADMINIZER_VITE_ENV=dev` for Adminizer-specific development mode.

This separation prevents a built Adminizer package from switching into dev asset mode when a host application sets `VITE_ENV=dev` for its own frontend.

## Local scripts

The local development scripts keep both variables:

- `ADMINIZER_VITE_ENV=dev` enables Adminizer development assets.
- `VITE_ENV=dev` remains available for fixture and demo code that still uses that variable.
