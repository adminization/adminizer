# Adminizer - Project Context

## Project Overview

Adminizer is a framework-agnostic admin panel for Node.js.
It includes a TypeScript backend and a React frontend, and can be integrated into server-side applications with different architectures.

## Key Characteristics

- Type: Node.js library/module
- Backend: TypeScript (ESM)
- Frontend: React + TypeScript + Vite
- UI stack: Radix UI, Tailwind CSS v4, shadcn/ui style components
- ORM support: Sequelize (active), TypeORM (experimental)
- License: MIT

## Current Development Focus

- Primary ORM: Sequelize
- TypeORM support exists but is experimental; keep Sequelize as the default recommendation
- For model adapter changes, prioritize `src/lib/model/adapter/sequelize.ts`

## Directory Structure

```text
adminizer/
|-- src/                    # Main source code
|   |-- assets/             # Frontend (React/TSX/CSS)
|   |-- controllers/        # Express controllers
|   |-- helpers/            # Utilities
|   |-- interfaces/         # Types/interfaces
|   |-- lib/                # Core modules
|   |-- models/             # Internal models
|   |-- policies/           # Access policies
|   |-- system/             # System wiring
|   `-- index.ts            # Main entry
|-- fixture/                # Demo app for local development
|-- modules/                # Extendable modules
|-- controls/               # Custom controls
|-- docs/                   # Documentation
|-- test/                   # Vitest tests
|-- translations/           # i18n resources
`-- dist/                   # Build output
```

## Build and Run Commands

### Development

```bash
npm run dev
npm run dev:no-seed
npm run dev:typeorm
npm run dev:typeorm:no-seed
npm run dev:cors
```

### Start

```bash
npm run start
npm run start:seed
npm run start:typeorm
npm run start:typeorm:seed
```

### Build

```bash
npm run build
npm run build:backend
npm run compile:backend
npm run compile:ui
npm run build:assets
npm run build:module
```

### Tests

```bash
npm run test
npm run test:watch
```

## Environment Variables

See `.env.example`.
Important variables include:

- `OPENAI_API_KEY`
- `ADMIN_LOGIN`
- `ADMIN_PASS`
- `JWT_SECRET`
- `AP_PASSWORD_SALT`
- `ORM`
- `NO_SEED_DATA`
- `ADMINIZER_ENV`

## Development Conventions

- Use TypeScript and keep identifiers in English
- Keep comments concise and in English
- Follow existing project architecture and naming style
- Use axios for frontend HTTP requests (CSRF handling is already integrated)

## Rules for AI Agents in This Repository

1. Do not create commits unless the user explicitly asks.
2. Write commit messages in English when commits are requested.
3. Reply in Russian in chat communication.
4. Do not start the development server unless the user explicitly asks.
5. After code changes, run `npm run compile:backend` by default.
6. Update documentation only when the user explicitly asks.
7. Do not translate technical artifacts (paths, keys, code identifiers).
8. rg is not available in the environment, use PowerShell search.

## Completion Checklist

Before finishing a coding task:

1. Ensure changed code is consistent with Sequelize-first direction.
2. Run `npm run compile:backend` (unless user requested a different verification flow).
3. Report what was changed and any checks that were not run.
