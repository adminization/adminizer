# Agent Skills

A **skill** is a server-side tool an agent may call. Skills are
provider-neutral: a skill is a JSON Schema plus an `execute` callback, so the
same definition works with the AI SDK, the OpenAI Agents API or any other
runtime. Every call is executed on behalf of the authenticated admin user and
re-checks that user's permissions.

Skills live in `AiAssistantAgentSkillHandler`, always available as
`adminizer.aiAssistantAgentSkillHandler`.

## Built-in skills

Registered for every agent, no configuration needed:

| Id | Purpose |
|---|---|
| `current_user` | Login, name, email, locale, groups and administrator flag of the user this conversation belongs to. |
| `list_admin_navigation` | The user's own admin menu grouped by section, plus the templates of parametrized pages. Accepts an optional `query`. |
| `list_data_models` | Models the user may read or edit, with fields, allowed operations, list URL and record URL template. |
| `read_model_records` | Read records of a readable model. Accepts `filter` (JSON object), `fields` and `limit` (max 50, default 10). |
| `update_model_record` | Update one record of an editable model by its identifier. |

Because every call re-checks permissions, an agent built on these skills can be
offered to non-administrator accounts as well.

`read_model_records` and `update_model_record` go through `DataAccessor`, so
field-level restrictions apply: fields the user may not edit are dropped by the
panel, not by the agent.

## Using skills inside an agent

```ts
const skills = this.getAgentSkills(user);

const skillTools = Object.fromEntries(skills.map((skill) => [skill.id, tool({
    description: skill.description,
    inputSchema: jsonSchema(skill.inputSchema),
    execute: async (input: Record<string, unknown>) => this.executeAgentSkill(skill.id, input, user),
})]));

const agent = new Agent({
    name: this.name,
    model: provider.chat(choice.model),
    instructions: systemPrompt,
    tools: {...skillTools, /* your own tools */},
});
```

* `getAgentSkills(user)` returns descriptors (`id`, `description`,
  `inputSchema`, `accessRightsToken`) — no `execute`, so the descriptor is safe
  to serialize.
* `executeAgentSkill(id, input, user)` performs the permission check and passes
  the result through `toJsonSafe()`.

Build the tool set per turn, not once per process: descriptions and schemas are
refined per user.

## Adding a skill from an app

```ts
setup(ctx: AppSetupContext): void {
    ctx.skills.agent({
        id: "reload_price_list",
        description: "Reload the price list from the ERP and report how many positions changed.",
        inputSchema: {
            type: "object",
            properties: {
                dryRun: {type: "boolean", description: "Only report what would change."},
            },
            additionalProperties: false,
        },
        accessRightsToken: "price-list-reload",
        execute: async (input, {user, userIdentity, runtime}) => {
            const result = await reloadPrices(runtime, Boolean(input.dryRun));
            return {changed: result.changed, requestedBy: userIdentity.login};
        },
    });
}
```

Rules enforced on registration:

* `id` must match `^[a-z][a-z0-9_-]*$` and be unique across all skills.
* A non-empty `description` is required — it is the only thing the model sees.
* Registration is deferred until the app's setup phase completes, and disabling
  the app removes the skill.

The `execute` context gives you:

| Field | Meaning |
|---|---|
| `user` | The full `User` record — pass it to `DataAccessor` for permission-aware data access. |
| `userIdentity` | JSON-safe descriptor of the same user (`id`, `login`, `fullName`, `email`, `locale`, `isAdministrator`, `groups`). |
| `runtime` | The `AppRuntime` of the app that owns the skill. |

## Permissions

Three independent layers:

1. **`accessRightsToken`** on the skill. A skill whose token the user lacks is
   neither described nor executable — the model never learns it exists.
2. **Per-call checks inside `execute`.** The built-in data skills resolve
   `read-<model>-model` / `update-<model>-model` on every call and throw when
   the user is not allowed, so a stale schema cannot be exploited.
3. **`DataAccessor`.** Field-level and user-owned-record restrictions are
   applied by the panel's own data layer.

### Per-user descriptions

`describe(user, adminizer)` refines what a particular user is told about a
skill. The built-in data skills use it to inject an `enum` of the models that
user may touch, so the model cannot invent a model name:

```ts
describe: (user) => {
    const models = modelNames(adminizer, user, "read");
    return {
        description: `Read records of a data model the current user may read. Readable models: ${models.join(", ") || "none"}.`,
        inputSchema: withModelEnum(readRecords.inputSchema, models),
    };
},
```

### `requiresUser`

Setting `requiresUser: true` advertises the calling user inside the input
schema: a required `currentUser` property whose `enum` is the single
authenticated login. The agent then sees who it acts for and echoes it back.

Whatever the model passes is **discarded** before `execute` runs and replaced
with the authenticated identity, so this cannot be used to impersonate — it is a
prompt-grounding device, not an authorization input.

## JSON-safe results

A tool result is stored verbatim in the agent's message history and re-validated
against the runtime's `ModelMessage[]` schema on every later turn. A single
non-JSON value — a `Date` on a Sequelize record, a `Buffer`, a cyclic relation —
does not fail only the call that produced it: it poisons the session, and every
subsequent turn dies with
`Invalid prompt: The messages do not match the ModelMessage[] schema`.

`toJsonSafe()` (exported from the package) converts arbitrary values into plain
JSON data:

* `Date` → ISO string, `Error` → message, `RegExp` → source, `BigInt` → string;
* `Buffer` / typed arrays / `ArrayBuffer` → `<binary N bytes>`;
* `Set` → array, `Map` → object, `toJSON()` honoured (Sequelize, Decimal, Luxon);
* cycles → `[Circular]`, depth over 12 → `[MaxDepth]`;
* non-finite numbers → `null`; `undefined` / functions / symbols dropped.

`executeAgentSkill()` applies it automatically. Apply it yourself for any other
tool result you produce, and repair sessions that MCP servers or subagents write
into:

```ts
session.messages = toJsonSafe(session.messages ?? []);
```

## Direct registration (host application)

An app is the recommended owner, but a host application can register skills
directly:

```ts
adminizer.aiAssistantAgentSkillHandler.add({
    id: "ping",
    description: "Health check.",
    inputSchema: {type: "object", properties: {}, additionalProperties: false},
    execute: () => ({ok: true}),
});
```

Skills registered without an owner default to `host` and are never removed
automatically.

## Testing

`test/ai-assistant-skills.test.ts` shows the pattern: build a minimal Adminizer
stand-in (config, `accessRightsHelper`, `modelHandler`, `menuHelper`,
`catalogHandler`), instantiate `AiAssistantAgentSkillHandler` and assert that a
user without a token sees neither the skill nor the model behind it.
