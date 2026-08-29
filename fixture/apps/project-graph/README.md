# Project graph — a hands-on `accessGraph` playground

This app exists for one reason: **to try record-level access over a model graph by hand, in a
running panel**, instead of reading about it in
[docs/AccessRights/user-owned-records.md](../../../docs/AccessRights/user-owned-records.md).

It implements the chain the documentation uses as its example —

```
Project ──< Task ──< Message
   ▲
   └── ProjectMember (user, role group)   ← membership is granted here, once
```

— and seeds enough data that every rule of the graph can be observed by logging in as a
different user and clicking around. Everything is packaged as an Adminizer app, so the whole
demo can be removed from the fixture with one environment variable.

---

## Run it

```bash
npm run start:seed            # Sequelize (default)
npm run start:typeorm:seed    # the same demo on TypeORM
```

Then open <http://localhost:3000/adminizer> and log in as one of the users below. The demo
models live in their own **Project graph** group in the sidebar, not mixed into the host's model
list — the group name is the app's `section` option.

To take the demo out completely — no models, no graph, no menu entries, no routes:

```bash
ENABLE_PROJECT_GRAPH=false npm run start:seed
```

> Seeding drops and recreates the fixture databases. `npm start` (without `:seed`) keeps the
> existing data, but then the demo rows are only there if a seeded run created them before.

---

## Who is who

| Login / password | Apollo | Borealis | What they should see |
| --- | --- | --- | --- |
| `user1` | **editor** | — | Only Apollo, its 2 tasks and 3 messages. Full CRUD inside Apollo. |
| `user2` | **viewer** | **editor** | Both projects and everything under them, but read-only in Apollo. |
| `user3` | — | **viewer** | Only Borealis, read-only. |
| `pass` | — | — | The sections are in the menu, and they are empty. |
| `admin` | — | — | Administrator: bypasses the graph entirely, sees all 4 tasks. |

The roles are ordinary `Group` records (`Project editors`, `Project viewers`) referenced by the
`group` column of a membership row. They grant nothing globally — they only decide *which
actions* a membership counts for. The global group `Users` carries the editor token set as the
upper bound (plus `access-to-adminpanel`, without which the panel would refuse the login itself).

Seeded content: projects **Apollo** and **Borealis**, two tasks each, 6 messages in total.

---

## What to click, and what it proves

Log in as **`user1`** (Apollo editor):

1. **Tasks** → 2 rows, both Apollo. *The graph filters a model that has no relation to the
   membership at all — `Task` inherits it from `Project`.*
2. **Messages** → 3 rows. *Two hops: `Message.task → Task.project → Project`. Nothing on
   `Message` mentions projects or memberships.*
3. **Tasks → Add** → the *Project* dropdown offers **Apollo only**. *Association pickers read
   their model through the same `DataAccessor`, so they are narrowed for free.*
4. Try to reach a Borealis task by URL: `/adminizer/model/Task/edit/3` → not found. *The filter
   is applied to the query, not to the rendering.*

Log in as **`user2`** (viewer in Apollo, editor in Borealis):

5. **Tasks** → all 4 rows, from both projects. Edit a **Borealis** task inline → saved.
   Edit an **Apollo** task inline → `404`. *Same user, same model, same token — the per-project
   role decides. `Project viewers` carries `read-task-model` only, so the Apollo membership does
   not count for an update.*

Log in as **`user3`** (Borealis viewer):

6. **Tasks → Add** offers Borealis (they may read it), but saving is refused. *Pickers are
   narrowed by read access; the write path re-validates the chosen parent for the action's verb.*

Log in as **`admin`**:

7. **Project members** is visible only here. *It is deliberately outside the graph: no group in
   the seed carries its CRUD tokens, so handing out project access stays an admin operation.*
8. Add a membership row for `pass`, pick a role, log back in as `pass` → the projects appear.
   *Nothing else changes: no config edit, no restart.*
9. Give a **global** group the `project-admin` token (Groups → tokens, department *Project
   graph*) and put a user in it → that user sees the whole graph unfiltered, membership or not.
   *That is the graph's `bypassToken`. It is matched against the user's own groups only —
   putting it on a membership role such as `Project viewers` changes nothing, which is the
   point: a role must not be able to widen its own project boundary.*

---

## How the app is put together

| File | Role |
| --- | --- |
| `ProjectGraphApp.ts` | The app itself: registers the 4 models, their CRUD tokens, the config patch (model UI, sidebar section **and** `accessGraph`), the bypass token, the add/edit routes and the seeding entry point. |
| `ProjectGraphModels.ts` | Sequelize models + `installProjectGraphSequelizeModels()`. |
| `ProjectGraphTypeOrmModels.ts` | The same entities as TypeORM `EntitySchema`s. |
| `projectGraphSeed.ts` | Demo data and the role groups. Idempotent, ORM-agnostic (goes through `runtime.models`). |

The graph declaration lives in `ProjectGraphApp.setup()`:

```ts
accessGraph: {
    project: {
        root: "Project",
        membership: {through: "ProjectMember", via: "user", group: "group"},
        include: {
            Task:    {parent: "project"},   // direct edge to the root
            Message: {parent: "task"},      // transitive, through Task
        },
        bypassToken: "project-admin",
    },
}
```

Two things about the wiring are worth knowing before you copy this app into a project of your own:

* **The host installs the tables, the app registers the models.** An app can add a model to the
  panel, but not a table to someone else's ORM connection — so `fixture/index.ts` calls
  `installProjectGraphSequelizeModels()` before enabling the app, and puts
  `projectGraphTypeOrmModels` into the DataSource entity list (TypeORM cannot add entities after
  `initialize()`).
* **Two things the core does at boot, an app must do itself.** Model CRUD tokens are registered
  from `config.models` during `init`, and `/model/<Name>/add` + `/edit/:id` routes are bound in
  the same pass — a model that joins later gets neither. The app therefore registers its own four
  tokens per model (an *unregistered* token id is denied to everyone but administrators) and its
  own add/edit routes wrapping the built-in controllers. List, view, remove, inline editing and
  filters need nothing: those routes are generic.

Seeding is called by the host (`projectGraphApp.seedDemoData()`), not on `app:enabled`, because
the membership rows reference the fixture's own users, who are created after the apps are up.

## Things to try next

The declaration is complete as it stands; the commented-out lines in `setup()` switch on the two
performance stages without changing anything else. Both address the same thing: as declared, one
message list costs three queries — memberships, then the tasks of those projects, then the
messages, with every task id of every project you belong to inlined into that last one. On four
demo tasks nobody notices; on an account with hundreds of projects that inlined list, not the
page size, is what the read costs.

* `graphRootField: {Message: "projectId"}` — a denormalized root id collapses the read filter to
  one step (the column would have to be added to the model and maintained by the app).
* `pushdown: true` — the whole walk compiles into one nested-subquery SQL instead of
  materialized id lists, so the statement stays the same size no matter how many projects the
  user belongs to. Watch it with `Adminizer.logger.level = 'debug'` and Sequelize logging on. If a
  chain cannot be compiled the model quietly goes back to materialization — quietly in the result,
  that is: the log carries one `[accessGraph] ... declares pushdown: true, but ...` warning per
  model with the reason.

To see the graph fail closed, break it on purpose: point an `include` edge at an alias that does
not exist, or make `Message.parent` reach a model outside the graph. The panel starts, logs the
structural problem, and denies access to the affected models rather than leaving them open.
