import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {Adminizer} from "../src/lib/Adminizer";
import {DataAccessor} from "../src/lib/DataAccessor";
import {AccessRightsHelper} from "../src/helpers/accessRightsHelper";
import {compileAccessGraph} from "../src/lib/access-graph/AccessGraphResolver";
import {RecordAccessCache} from "../src/lib/access-graph/RecordAccessCache";
import {AbstractHistoryAdapter} from "../src/lib/history-actions/AbstractHistoryAdapter";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {buildInternalModelAccess} from "../src/system/buildInternalModelAccess";
import {ModelResource} from "../src/interfaces/types";
import {ActionType, AdminpanelConfig} from "../src/interfaces/adminpanelConfig";
import {HistoryActions} from "../src/models/HistoryActions";
import {User} from "../src/models/User";

const logger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
    silly: vi.fn(),
    close: vi.fn(),
}));

vi.mock("winston", () => {
    const winston = {
        format: {
            combine: vi.fn(() => ({})),
            timestamp: vi.fn(() => ({})),
            printf: vi.fn(() => ({})),
        },
        transports: {
            Console: class Console {},
            File: class File {},
        },
        createLogger: vi.fn(() => logger),
    };

    return {...winston, default: winston};
});

/**
 * Hardening of the record-access surfaces that the CRUD criteria alone do not cover:
 * populated associations, the change history, ownership transfer, criteria merging,
 * pushdown/materialization equivalence and the compiled-graph cache.
 */
describe("record access hardening", () => {
    const sequelizeConnections: Sequelize[] = [];

    afterEach(async () => {
        await Promise.all(sequelizeConnections.splice(0).map((orm) => orm.close()));
        logger.warn.mockClear();
    });

    /**
     * Project ← ProjectMember(user, project) is the graph root; Task hangs off it.
     * Note is outside every graph but points at a Task — the "sideways" reference a
     * restricted model can be read through.
     */
    async function buildContext(options: {
        accessGraph?: AdminpanelConfig["accessGraph"],
        paranoidMembership?: boolean,
        queries?: string[],
        models?: AdminpanelConfig["models"],
        /** Models left unregistered, for the compiled-graph cache scenario. */
        skipModels?: string[],
    } = {}) {
        const collectedQueries = options.queries;
        const orm = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: collectedQueries ? (sql: string) => collectedQueries.push(sql) : false,
        });
        sequelizeConnections.push(orm);

        const UserModel = orm.define("User", {login: DataTypes.STRING});
        const GroupModel = orm.define("Group", {name: DataTypes.STRING, tokens: DataTypes.JSON});
        const ProjectModel = orm.define("Project", {name: DataTypes.STRING});
        const ProjectMemberModel = orm.define("ProjectMember", {}, options.paranoidMembership
            ? {paranoid: true, timestamps: true}
            : {});
        const TaskModel = orm.define("Task", {title: DataTypes.STRING});
        const NoteModel = orm.define("Note", {text: DataTypes.STRING});

        ProjectMemberModel.belongsTo(UserModel, {foreignKey: "userId", as: "user"});
        ProjectMemberModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        TaskModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        NoteModel.belongsTo(TaskModel, {foreignKey: "taskId", as: "task"});

        await orm.sync({force: true});
        await UserModel.create({id: 7, login: "u7"});
        await UserModel.create({id: 8, login: "u8"});

        const adapter = new SequelizeAdapter(orm);
        const adminizer = new Adminizer([adapter]);
        adminizer.config = {
            routePrefix: "",
            auth: {enable: false},
            history: {enabled: true},
            security: {},
            models: options.models ?? {
                User: {}, Group: {}, Project: {}, ProjectMember: {}, Task: {}, Note: {},
            },
            accessGraph: options.accessGraph,
        } as any;

        const ormModels = {
            User: UserModel,
            Group: GroupModel,
            Project: ProjectModel,
            ProjectMember: ProjectMemberModel,
            Task: TaskModel,
            Note: NoteModel,
        };
        for (const [name, model] of Object.entries(ormModels)) {
            if (options.skipModels?.includes(name)) {
                continue;
            }
            adminizer.modelHandler.add(name, new adapter.Model(name, model));
        }
        adminizer.modelHandler.configureInternalAccess(
            buildInternalModelAccess(adminizer.config, adminizer.modelHandler)
        );

        const accessor = (modelName: string, user: Partial<User>, action: ActionType = "list", cache?: RecordAccessCache) => {
            const modelResource: ModelResource = {
                name: modelName,
                config: adminizer.config.models[modelName],
                model: adminizer.modelHandler.getResource(modelName),
                uri: `/model/${modelName.toLowerCase()}`,
            };
            return new DataAccessor(adminizer, user as User, modelResource, action, cache);
        };

        /** Registered model wrapper; every model used here is registered by construction. */
        const resource = (modelName: string) => adminizer.modelHandler.getResource(modelName)!;

        return {orm, adminizer, adapter, models: ormModels, accessor, resource};
    }

    const admin: Partial<User> = {id: 900, login: "admin", isAdministrator: true, groups: []};
    const member = (id: number, groups: any[] = []): Partial<User> =>
        ({id, login: `user-${id}`, isAdministrator: false, groups});

    const projectGraph: AdminpanelConfig["accessGraph"] = {
        project: {
            root: "Project",
            membership: {through: "ProjectMember", via: "user"},
            include: {Task: {parent: "project"}},
        },
    };

    /** Two projects, user 7 a member of p1 only, one task and one note in each. */
    async function seed(ctx: Awaited<ReturnType<typeof buildContext>>) {
        const p1 = await ctx.models.Project.create({name: "p1"});
        const p2 = await ctx.models.Project.create({name: "p2"});
        await ctx.models.ProjectMember.create({userId: 7, projectId: p1.get("id")});
        const t1 = await ctx.models.Task.create({title: "t1", projectId: p1.get("id")});
        const t2 = await ctx.models.Task.create({title: "secret", projectId: p2.get("id")});
        const n1 = await ctx.models.Note.create({text: "n1", taskId: t1.get("id")});
        const n2 = await ctx.models.Note.create({text: "n2", taskId: t2.get("id")});
        return {p1, p2, t1, t2, n1, n2};
    }

    describe("populated associations", () => {
        it("reduces a populated record of a restricted model to its id when it is out of reach", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1, t2} = await seed(ctx);

            const notes = ctx.resource("Note");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", member(7)));

            // The note itself is unrestricted, so both rows come back...
            expect(records).toHaveLength(2);
            // ...but only the task of the project the user belongs to keeps its fields
            expect(records[0].task).toMatchObject({id: t1.get("id"), title: "t1"});
            expect(records[1].task).toBe(t2.get("id"));
        });

        it("leaves everything populated for an administrator", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            await seed(ctx);

            const notes = ctx.resource("Note");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", admin));

            expect(records[0].task).toMatchObject({title: "t1"});
            expect(records[1].task).toMatchObject({title: "secret"});
        });

        it("compiles the confinement into the populate JOIN and skips the verification query", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1, t2} = await seed(ctx);

            const notes = ctx.resource("Note");
            const taskLookups = vi.spyOn(ctx.resource("Task"), "find");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", member(7)));

            // Same reduction as above, but performed by the database inside the JOIN:
            // no follow-up query against the associated model at all.
            expect(records[0].task).toMatchObject({id: t1.get("id"), title: "t1"});
            expect(records[1].task).toBe(t2.get("id"));
            expect(taskLookups).not.toHaveBeenCalled();
        });

        it("leaves a genuinely absent association null under pushdown", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            await seed(ctx);
            await ctx.models.Note.create({text: "orphan", taskId: null});

            const notes = ctx.resource("Note");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", member(7)));

            expect(records[2].task).toBeNull();
        });

        it("falls back to one verification lookup per page when the adapter cannot push down", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1, t2} = await seed(ctx);

            const notes = ctx.resource("Note");
            vi.spyOn(notes as any, "canPushdownPopulateAccess").mockReturnValue(false);
            const taskLookups = vi.spyOn(ctx.resource("Task"), "find");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", member(7)));

            // The reduced shape is identical either way — only the mechanics differ.
            expect(records[0].task).toMatchObject({id: t1.get("id"), title: "t1"});
            expect(records[1].task).toBe(t2.get("id"));
            expect(taskLookups).toHaveBeenCalledTimes(1);
        });

        it("ignores a populateOn smuggled through the criteria", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            await seed(ctx);

            const notes = ctx.resource("Note");
            vi.spyOn(notes as any, "canPushdownPopulateAccess").mockReturnValue(false);
            const records = await notes.find(
                {sort: "id ASC", populateOn: {task: {id: {in: [1, 2]}}}} as any,
                ctx.accessor("Note", member(7))
            );

            // A hand-built populateOn must not suppress the verification.
            expect(records[1].task).not.toMatchObject({title: "secret"});
        });

        it("does not verify the graph parent edge: a visible child implies a visible parent", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {p1} = await seed(ctx);

            const tasks = ctx.resource("Task");
            const projectLookups = vi.spyOn(ctx.resource("Project"), "find");
            const records = await tasks.find({}, ctx.accessor("Task", member(7)));

            expect(records).toHaveLength(1);
            expect(records[0].project).toMatchObject({id: p1.get("id"), name: "p1"});
            expect(projectLookups).not.toHaveBeenCalled();
        });

        it("terminates when two restricted models reference each other sideways", async () => {
            // Note is pulled into the graph too, so Note ⇄ Task are mutually referencing
            // restricted models: verification must read ids only, never re-enter itself.
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {Task: {parent: "project"}, Note: {parent: "task"}},
                    },
                },
            });
            const {t1} = await seed(ctx);

            const notes = ctx.resource("Note");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", member(7)));

            expect(records).toHaveLength(1);
            expect(records[0].task).toMatchObject({id: t1.get("id"), title: "t1"});
        });

        it("leaves models without any record access rules untouched", async () => {
            const ctx = await buildContext({});
            await seed(ctx);

            const notes = ctx.resource("Note");
            const records = await notes.find({sort: "id ASC"}, ctx.accessor("Note", member(7)));

            expect(records[0].task).toMatchObject({title: "t1"});
            expect(records[1].task).toMatchObject({title: "secret"});
        });
    });

    describe("change history", () => {
        class TestHistoryAdapter extends AbstractHistoryAdapter {
            public id = "test";
            public constructor(adminizer: Adminizer) {
                super(adminizer);
            }
            public async getAllModelHistory(): Promise<HistoryActions[]> { return []; }
            public async getAllHistory(): Promise<{data: HistoryActions[]}> { return {data: []}; }
            public async setHistory(): Promise<void> { /* not used */ }
            public async getModelFieldsHistory(): Promise<Record<string, any>> { return {}; }
            public filter(history: HistoryActions[], user: User) {
                return this.filterHistoryByRecordAccess(history, user);
            }
        }

        const historyRow = (modelName: string, modelId: unknown, userId: number): HistoryActions =>
            ({modelName, modelId: String(modelId), user: {id: userId}} as unknown as HistoryActions);

        it("drops rows about records the user cannot reach", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1, t2} = await seed(ctx);
            const adapter = new TestHistoryAdapter(ctx.adminizer);

            const filtered = await adapter.filter([
                historyRow("Task", t1.get("id"), 900),
                historyRow("Task", t2.get("id"), 900),
            ], member(7) as User);

            expect(filtered).toHaveLength(1);
            expect(filtered[0].modelId).toBe(String(t1.get("id")));
        });

        it("keeps the user's own actions, so a delete stays in their audit trail", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t2} = await seed(ctx);
            const adapter = new TestHistoryAdapter(ctx.adminizer);

            // id 999 never existed (deleted record) but the acting user is the reader
            const filtered = await adapter.filter([
                historyRow("Task", 999, 7),
                historyRow("Task", t2.get("id"), 8),
            ], member(7) as User);

            expect(filtered).toHaveLength(1);
            expect(filtered[0].modelId).toBe("999");
        });

        it("leaves history of unrestricted models and administrators untouched", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1, t2, n1} = await seed(ctx);
            const adapter = new TestHistoryAdapter(ctx.adminizer);

            const unrestricted = await adapter.filter([historyRow("Note", n1.get("id"), 8)], member(7) as User);
            expect(unrestricted).toHaveLength(1);

            const asAdmin = await adapter.filter([
                historyRow("Task", t1.get("id"), 8),
                historyRow("Task", t2.get("id"), 8),
            ], admin as User);
            expect(asAdmin).toHaveLength(2);
        });
    });

    describe("ownership transfer token", () => {
        const ownedModels = {
            User: {}, Group: {}, Project: {}, ProjectMember: {}, Note: {},
            Task: {userAccessRelation: "project"},
        } as any;

        it("stamps the owner for a user without the token", async () => {
            const ctx = await buildContext({models: ownedModels});
            const {p2} = await seed(ctx);

            const record = await ctx.accessor("Task", member(7), "add")
                .setUserRelationAccess({title: "t", project: p2.get("id")});

            // The relation points at Project (neither User nor Group), so the forged value
            // is stripped rather than replaced
            expect(record).not.toHaveProperty("project");
        });

        it("keeps an explicit value for a group carrying transfer-<model>-ownership", async () => {
            const ctx = await buildContext({models: ownedModels});
            const {p2} = await seed(ctx);
            const holder = member(7, [{id: 1, name: "transferers", tokens: ["transfer-task-ownership"]}]);

            const record = await ctx.accessor("Task", holder, "add")
                .setUserRelationAccess({title: "t", project: p2.get("id")});

            expect(record).toMatchObject({project: p2.get("id")});
        });

        it("is registered only for models declaring userAccessRelation", async () => {
            const ctx = await buildContext({models: ownedModels});
            const helper = new AccessRightsHelper(ctx.adminizer);
            ctx.adminizer.accessRightsHelper = helper;
            const bindAccessRights = (await import("../src/system/bindAccessRights")).default;
            await bindAccessRights(ctx.adminizer);

            expect(helper.hasToken("transfer-Task-ownership")).toBe(true);
            expect(helper.hasToken("transfer-Note-ownership")).toBe(false);
        });
    });

    describe("criteria merging", () => {
        it("intersects a user filter with the access filter on the same field", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {p2, t1} = await seed(ctx);
            const tasks = ctx.resource("Task");

            // Record access allows p1 only; the caller asks for p2 — the answer is "nothing",
            // not "everything access allows"
            const foreign = await tasks.find(
                {where: {project: p2.get("id")}},
                ctx.accessor("Task", member(7))
            );
            expect(foreign).toHaveLength(0);

            const own = await tasks.find(
                {where: {project: (t1 as any).get("projectId")}},
                ctx.accessor("Task", member(7))
            );
            expect(own).toHaveLength(1);
        });
    });

    describe("pushdown equivalence", () => {
        for (const pushdown of [false, true]) {
            it(`ignores soft-deleted membership rows (pushdown: ${pushdown})`, async () => {
                const ctx = await buildContext({
                    paranoidMembership: true,
                    accessGraph: {
                        project: {
                            root: "Project",
                            membership: {through: "ProjectMember", via: "user"},
                            include: {Task: {parent: "project"}},
                            pushdown,
                        },
                    },
                });
                await seed(ctx);

                const tasks = ctx.resource("Task");
                expect(await tasks.find({}, ctx.accessor("Task", member(7)))).toHaveLength(1);

                // Revoking the membership must take effect in both modes alike
                await ctx.models.ProjectMember.destroy({where: {userId: 7}});
                expect(await tasks.find({}, ctx.accessor("Task", member(7)))).toHaveLength(0);
            });
        }
    });

    describe("compiled graph cache", () => {
        it("is not shared between two Adminizer instances using one config object", async () => {
            const first = await buildContext({accessGraph: projectGraph});
            const second = await buildContext({accessGraph: projectGraph, skipModels: ["Task"]});
            // The very same config object, as an embedding app handing one out could produce
            second.adminizer.config.accessGraph = first.adminizer.config.accessGraph;

            // Compiling the fuller registry first is what used to poison the other instance
            expect(compileAccessGraph(first.adminizer)!.nodes.has("task")).toBe(true);
            expect(compileAccessGraph(second.adminizer)!.nodes.has("task")).toBe(false);
        });
    });

    describe("shared record-access cache", () => {
        it("resolves the membership lookup once for every accessor of a request", async () => {
            const queries: string[] = [];
            const ctx = await buildContext({accessGraph: projectGraph, queries});
            await seed(ctx);
            const tasks = ctx.resource("Task");

            const cache = new RecordAccessCache();
            queries.length = 0;
            await tasks.find({}, ctx.accessor("Task", member(7), "list", cache));
            await tasks.find({}, ctx.accessor("Task", member(7), "list", cache));

            const membershipQueries = queries.filter((sql) => sql.includes("FROM `ProjectMembers`"));
            expect(membershipQueries).toHaveLength(1);
        });
    });

    describe("contextual token guard", () => {
        it("refuses to register a model CRUD token carrying a check", async () => {
            const ctx = await buildContext({});
            const helper = new AccessRightsHelper(ctx.adminizer);

            expect(() => helper.registerToken({
                id: "read-Task-model",
                name: "Read",
                description: "contextual",
                department: "Model Task",
                check: async () => true,
            } as any)).toThrow(/cannot carry a contextual/);

            expect(() => helper.registerToken({
                id: "read-Task-model",
                name: "Read",
                description: "plain",
                department: "Model Task",
            })).not.toThrow();
        });
    });
});
