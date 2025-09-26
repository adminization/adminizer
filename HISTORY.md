## 4.3.4
- Replaced the AI assistant modal with a quarter-width slide-out panel that keeps the main layout visible while chatting.

## 4.3.3
- Enabled the AI assistant in the fixture configuration with the dummy model and ensured the backend build wires controller en
dpoints.
- Documented that the fixture ships with the in-memory assistant for local testing.

## 4.3.2
- Added AI assistant chat mode with header toggle, in-memory history, and backend API scaffolding.


## 4.2.1
- Renamed MediaManager parent association to `parent` to resolve Sequelize naming collision.
## 4.1.4
- Fixed Sequelize system model registration errors in tests.
## 4.1.3
- Fixed build issues when compiling media manager
- Added material-icons dependency and troubleshooting notes

## 4.1.2
- Added documentation on assigning icons using the Lucide set.
- Updated widget example to reference Lucide icons.

- Added system model tests for Waterline and Sequelize.


## 4.2.1
- Fixed failing tests by adding case-insensitive model lookup and resolving Sequelize association naming conflicts.

## 4.2.2
- Explicit foreign key names now avoid collisions between attributes and associations in Sequelize.

## 4.3.1
- Added TypeScript Umzug migration for system models at `src/migrations/umzug/0001.ts` (SQLite fixture-compatible). Join table naming normalized to lowercase (`groupapuserap`). Updated docs in `docs/Database-Migrations-Umzug.md` and examples for tsx-based runs.
