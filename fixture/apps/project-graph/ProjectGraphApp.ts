/**
 * Project → Task → Message: the reference implementation of `accessGraph`, packaged as
 * an Adminizer app so the whole demo can be switched off in one line.
 *
 * Everything the demo owns is declared in `setup()` and therefore disappears again when
 * the app is disabled: the three panel models and their CRUD tokens, the graph itself
 * (`accessGraph.project`), the bypass token and the add/edit routes.
 *
 * What the app cannot own is the tables: an app may register a model with the panel, but
 * it cannot add tables to the host's ORM connection. The host installs them before
 * enabling the app — `installProjectGraphSequelizeModels()` for Sequelize,
 * `projectGraphTypeOrmModels` in the DataSource entity list for TypeORM.
 */
import {AbstractAdminizerApp, AppSetupContext, AppRuntime, type AppConfigPatch} from "../../../dist";
// The built-in add/edit controllers. Model routes are bound at init from `config.models`,
// so a model that joins the panel later (as app models do) has a list, view and remove
// route from the generic `/model/:modelResourceName/...` handlers, but no add/edit route.
// Registering them as app controllers keeps them tied to the app lifecycle.
import _add from "../../../dist/controllers/add.js";
import _edit from "../../../dist/controllers/edit.js";
import {projectGraphModelNames} from "./ProjectGraphModels";
import {seedProjectGraph} from "./projectGraphSeed";

export const PROJECT_GRAPH_BYPASS_TOKEN = "project-admin";

export interface ProjectGraphAppConfig {
    /** ORM adapter the models were installed on. */
    adapter?: string;
    /** Global group of the demo users, granted the models' CRUD tokens while seeding. */
    baseGroup: string;
    /**
     * Its holders see every project of the graph, membership or not. Granted to nobody by
     * default — assign it to a group in the panel to try it out.
     */
    bypassToken: string;
    /**
     * Sidebar section the demo models are grouped under (and the rights department of
     * the bypass token) — the demo stays out of the host's own model list.
     */
    section: string;
}

export class ProjectGraphApp extends AbstractAdminizerApp<ProjectGraphAppConfig> {
    readonly name = "project-graph";
    readonly version = "1.0.0";
    declare readonly config: ProjectGraphAppConfig;

    /** Captured while the app is enabled; the seeding step is the only user of it. */
    private runtime?: AppRuntime;

    constructor(config: Partial<ProjectGraphAppConfig> = {}) {
        super();
        this.config = {
            baseGroup: "Users",
            bypassToken: PROJECT_GRAPH_BYPASS_TOKEN,
            section: "Project graph",
            ...config,
        };
    }

    /**
     * Writes the demo projects, memberships, tasks and messages. Called by the host
     * rather than on `app:enabled`, because the memberships reference the host's own
     * seeded users — who exist only once the host says so. Idempotent.
     */
    async seedDemoData(): Promise<void> {
        if (!this.runtime) {
            throw new Error(`App "${this.name}" must be enabled before seeding its demo data`);
        }
        await seedProjectGraph(this.runtime.models, {baseGroup: this.config.baseGroup});
    }

    setup(ctx: AppSetupContext): void {
        const {project, member, task, message} = projectGraphModelNames;

        for (const modelName of [project, member, task, message]) {
            ctx.model({name: modelName, adapter: this.config.adapter});
            // Model CRUD tokens are registered at boot from `config.models`, which the app
            // patches only afterwards — so the app registers its own. An unregistered token
            // is denied to everyone but administrators.
            this.registerModelTokens(ctx, modelName);
        }

        // User and Group are needed by the seeding step only.
        ctx.modelAccess({models: [project, member, task, message, "User", "Group"]});

        ctx.accessRight({
            id: this.config.bypassToken,
            name: "Project graph bypass",
            description: "See every project of the graph, membership or not",
            department: this.config.section,
        });

        ctx.config({
            models: this.modelsConfig(),
            accessGraph: {
                /**
                 * Membership is declared once, at the root: a user reaches a Project through a
                 * ProjectMember row, and the row's `group` — a regular Group record used as a
                 * per-project role — decides which actions that membership counts for. Task and
                 * Message carry no rule of their own; they inherit the reach down their parent
                 * edges, Message transitively through Task.
                 */
                project: {
                    root: project,
                    membership: {through: member, via: "user", group: "group"},
                    include: {
                        [task]: {parent: "project"},    // Task.project → Project (the root)
                        [message]: {parent: "task"},    // Message.task → Task → Project
                    },
                    bypassToken: this.config.bypassToken,
                    // Optional stages, both leave the declaration above unchanged:
                    //   graphRootField: {[message]: "projectId"}, // denormalized root id, one-step filter
                    //   pushdown: true,                           // one nested-subquery SQL per read
                },
            },
        });

        for (const modelName of [project, member, task, message]) {
            ctx.controller({
                id: `add-${modelName}`,
                method: "all",
                route: `/model/${modelName}/add`,
                middleware: _add as MiddlewareType,
                policies: [
                    {type: "auth", mode: "ui"},
                    {type: "permission", token: `create-${modelName}-model`.toLowerCase(), mode: "ui"},
                ],
            });
            ctx.controller({
                id: `edit-${modelName}`,
                method: "all",
                route: `/model/${modelName}/edit/:id`,
                middleware: _edit as MiddlewareType,
                policies: [
                    {type: "auth", mode: "ui"},
                    {type: "permission", token: `update-${modelName}-model`.toLowerCase(), mode: "ui"},
                ],
            });
        }

        ctx.listener("app:enabled", (payload: {appName?: string}, runtime: AppRuntime) => {
            if (payload?.appName === this.name) {
                this.runtime = runtime;
            }
        });
        ctx.listener("app:disabled", (payload: {appName?: string}) => {
            if (payload?.appName === this.name) {
                this.runtime = undefined;
            }
        });
    }

    private registerModelTokens(ctx: AppSetupContext, modelName: string): void {
        const department = `Model ${modelName}`;
        const actions: [string, string][] = [
            ["create", "Create"],
            ["read", "Read"],
            ["update", "Update"],
            ["delete", "Delete"],
        ];
        for (const [verb, name] of actions) {
            ctx.accessRight({
                id: `${verb}-${modelName}-model`.toLowerCase(),
                name,
                description: `Access to ${verb} records of ${modelName}`,
                department,
            });
        }
    }

    // Annotated so the object literal is contextually typed: without it `type: "string"`
    // widens to `string` and stops selecting a member of the ModelFieldConfig union.
    private modelsConfig(): NonNullable<AppConfigPatch["models"]> {
        const {project, member, task, message} = projectGraphModelNames;
        const hideTimestamps = {
            createdAt: {visible: false},
            updatedAt: {visible: false},
        };
        // Keeps the demo in its own sidebar group instead of the host's "Platform" list
        const navbar = {section: this.config.section};

        return {
            [project]: {
                title: "Projects",
                model: project.toLowerCase(),
                displayName: "name",
                icon: "workspaces",
                navbar,
                fields: {
                    ...hideTimestamps,
                    name: {title: "Name", type: "string", required: true},
                    description: {title: "Description", type: "text"},
                },
            },
            [task]: {
                title: "Tasks",
                model: task.toLowerCase(),
                displayName: "title",
                icon: "task_alt",
                navbar,
                fields: {
                    ...hideTimestamps,
                    title: {title: "Title", type: "string", required: true},
                    status: {
                        title: "Status",
                        type: "select",
                        isIn: {open: "Open", in_progress: "In progress", done: "Done"},
                    },
                    // The graph edge. Its picker needs no configuration: it reads Project
                    // through the same DataAccessor, so only the user's own projects are
                    // offered — and a foreign one is refused on save.
                    project: {
                        title: "Project",
                        required: true,
                        displayModifier: (data: any) => data?.name || "",
                    },
                },
            },
            [message]: {
                title: "Messages",
                model: message.toLowerCase(),
                displayName: "text",
                icon: "chat",
                navbar,
                fields: {
                    ...hideTimestamps,
                    text: {title: "Message", type: "text", required: true},
                    task: {
                        title: "Task",
                        required: true,
                        displayModifier: (data: any) => data?.title || "",
                    },
                    author: {
                        title: "Author",
                        displayModifier: (data: any) => data?.login || "",
                    },
                },
            },
            // The source of the memberships, deliberately outside the graph: only
            // administrators hold its tokens, so only they hand out project access.
            [member]: {
                title: "Project members",
                model: member.toLowerCase(),
                icon: "group",
                navbar,
                fields: {
                    ...hideTimestamps,
                    project: {
                        title: "Project",
                        required: true,
                        displayModifier: (data: any) => data?.name || "",
                    },
                    user: {
                        title: "User",
                        required: true,
                        displayModifier: (data: any) => data?.login || "",
                    },
                    group: {
                        title: "Role (group)",
                        displayModifier: (data: any) => data?.name || "",
                    },
                },
            },
        };
    }
}
