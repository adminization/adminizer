# History System Documentation

## Overview

The History system in Adminizer provides a flexible and extensible way to track changes to model instances, store historical records, and expose them securely to users through an API. It supports multiple adapters, access control, model-specific configurations, and smart data formatting.

The core idea is to **capture state snapshots** of any model change (create, update, delete), assign metadata (user, timestamp, model name, ID), and allow retrieval filtered by user permissions, time range, or model type.

---

## Key Components

### 1. `HistoryHandler`

- Central registry for managing one or more history adapters.
- Aggregates functionality from registered adapters.
- Ensures proper routing of requests based on adapter availability.

### 2. `AbstractHistoryAdapter`

An abstract base class defining the contract for all history adapters. It includes:
- Access rights management (`history-${id}`, `users-history-${id}`).
- Built-in filtering based on user permissions.
- Model access checks (via `getModels()`).
- Data enhancement (e.g., `displayName` resolution).
- Media manager and association field handling.
- Protection against internal/admin models via `excludedModels`.

---

## Default Adapter: `DefaultHistoryAdapter`

This built-in adapter uses the canonical `HistoryActions` system model to persist history records in the database.

### How It Works

1. **Storage**  
   On every tracked change:
   - Existing current record (`isCurrent: true`) for the same `(modelName, modelId)` is marked as outdated.
   - A new record is created with `isCurrent: true`, containing:
     - `modelName`, `modelId`
     - `user` (ID or login)
     - `action` (e.g., "update")
     - `data` — full snapshot of the model's fields at that time
     - Timestamps (`createdAt`, etc.)

2. **Retrieval**
   - Filters results based on:
     - User's read access to the model.
     - Whether the user has `users-history-default` permission (to view others’ actions).
     - Optional filters: `modelName`, `forUserName`, `from`, `to`, pagination.

3. **Data Formatting**
   - Resolves `displayName` using model config:
     ```ts
     displayName: string | ((record: any) => string)
     ```
     If not defined → falls back to `modelId`.

4. **Security**
   - Respects RBAC (Role-Based Access Control).
   - Adminizer infrastructure models are excluded by default. The app-owned media manager models remain excluded by name for v5 compatibility, but they are not core system models.
   - Configurable extra exclusions via `config.history.excludeModels`.

---

## Configuration (Type Definition)

```ts
interface HistoryConfig {
  enabled?: boolean;
  adapter?: string; // 'default' | custom adapter ID
  excludeModels?: string[]; // additional models to exclude from tracking
}
```

**Example:**

```ts
config: {
  history: {
    enabled: true,
    adapter: "default", // optional, default if not specified
    excludeModels: ["post", "category"]
  }
}
```
If `enabled: false` or not set, no history will be recorded or served.

## Using a Custom Adapter
You can replace or extend the default behavior by implementing your own adapter.

**Step 1:** Implement `AbstractHistoryAdapter`

```ts
import { AbstractHistoryAdapter } from '../lib/history-actions/AbstractHistoryAdapter';
import { HistoryActions, User } from '../models';

export class MyCustomHistoryAdapter extends AbstractHistoryAdapter {
  public id = 'myadapter'; // must be unique
  public model = 'custom_history'; // optional, depends on your storage

  constructor(adminizer) {
    super(adminizer);
    // Your initialization
  }

  async getAllHistory(...) { ... }
  async getAllModelHistory(...) { ... }
  async setHistory(...) { ... }
  async getModelFieldsHistory(...) { ... }
}
```

You must implement all abstract methods.

**Step 2:** Register Your Adapter

```ts
adminizer.historyHandler = new HistoryHandler();
adminizer.historyHandler.add(new MyCustomHistoryAdapter(adminizer));
```
Use Cases for Custom Adapters

Logging to external systems (e.g., Kafka, ELK).
Immutable storage (e.g., blockchain-like ledger).
Lightweight logging without full snapshots.
Different DB (e.g., MongoDB, Redis for recent activity).

## Access Control Tokens

Each adapter registers its own permissions:

| Token | Purpose |
|-------|---------|
| `history-${id}` | General access to view history |
| `users-history-${id}` | View history of any user (otherwise only own) |

These are auto-registered with the Adminizer access rights system.

## Summary Flow

| Step | Description |
|------|-------------|
| **1** | **Model Update** |
| **2** | Adminizer calls `.setHistory(data)` |
| **3** | Adapter saves snapshot with: `user`, `model`, `id`, `data`, `isCurrent = true` |
| **4** | Older records for same `(model, id)` → `isCurrent = false` |
| **5** | **On GET history → filter by:**<br>• User permissions<br>• Model access<br>• Time range<br>• User scope (own vs all) |
| **6** | **Format output:**<br>• Add `displayName`<br>• Resolve media/associations |
| **7** | **Return to frontend** |

## Notes

The system is opt-out: all models are tracked unless listed in excludeModels.
Future improvements may include diff-only storage and compression.
