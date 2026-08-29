import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {Adminizer} from "../src/lib/Adminizer";
import {DataAccessor} from "../src/lib/DataAccessor";
import {validateAccessGraph} from "../src/lib/access-graph/AccessGraphResolver";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {buildInternalModelAccess} from "../src/system/buildInternalModelAccess";
import {ModelResource} from "../src/interfaces/types";
import {ActionType, AdminpanelConfig, ModelConfig} from "../src/interfaces/adminpanelConfig";
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

    return {
        ...winston,
        default: winston,
    };
});

describe("accessGraph", () => {
    const sequelizeConnections: Sequelize[] = [];

    afterEach(async () => {
        await Promise.all(sequelizeConnections.splice(0).map((orm) => orm.close()));
    });

    /**
     * One schema serves every scenario:
     *  - Project ← ProjectMember(user, project, group) — membership at the graph root
     *  - Task.project → Project — direct edge to the root
     *  - Comment.task → Task, AgentRun.task → Task — transitive edges
     *  - Comment.author → User — an edge escaping the graph (misdeclaration case)
     *  - CycA.peer ⇄ CycB.peer — a cycle that never reaches the root
     *  - Org — a second root for the two-graphs-per-model case
     *  - Note — a model outside every graph
     */
    async function buildContext(options: {
        accessGraph?: AdminpanelConfig["accessGraph"],
        commentConfig?: Partial<ModelConfig>,
        /** When set, every executed SQL statement is pushed here. */
        queries?: string[],
        /** Models left unregistered at boot, for the late-registration scenarios. */
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
        const GroupModel = orm.define("Group", {
            name: DataTypes.STRING,
            tokens: DataTypes.JSON,
        });
        const OrgModel = orm.define("Org", {name: DataTypes.STRING});
        const ProjectModel = orm.define("Project", {name: DataTypes.STRING});
        const ProjectMemberModel = orm.define("ProjectMember", {});
        const TaskModel = orm.define("Task", {title: DataTypes.STRING});
        // projectId is the denormalized root-id column exercised by the graphRootField tests
        const CommentModel = orm.define("Comment", {text: DataTypes.STRING, projectId: DataTypes.INTEGER});
        const AgentRunModel = orm.define("AgentRun", {status: DataTypes.STRING});
        const NoteModel = orm.define("Note", {text: DataTypes.STRING});
        const CycAModel = orm.define("CycA", {});
        const CycBModel = orm.define("CycB", {});

        ProjectMemberModel.belongsTo(UserModel, {foreignKey: "userId", as: "user"});
        ProjectMemberModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        ProjectMemberModel.belongsTo(GroupModel, {foreignKey: "groupId", as: "group"});
        TaskModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        CommentModel.belongsTo(TaskModel, {foreignKey: "taskId", as: "task"});
        CommentModel.belongsTo(UserModel, {foreignKey: "authorId", as: "author"});
        AgentRunModel.belongsTo(TaskModel, {foreignKey: "taskId", as: "task"});
        CycAModel.belongsTo(CycBModel, {foreignKey: "peerId", as: "peer"});
        CycBModel.belongsTo(CycAModel, {foreignKey: "peerId", as: "peer"});

        await orm.sync({force: true});

        // sqlite enforces the FKs above, so the acting users must exist as rows
        await UserModel.create({id: 7, login: "u7"});
        await UserModel.create({id: 8, login: "u8"});

        const adapter = new SequelizeAdapter(orm);
        const adminizer = new Adminizer([adapter]);
        adminizer.config = {
            routePrefix: "",
            auth: {enable: false},
            models: {
                User: {},
                Group: {},
                Org: {},
                Project: {},
                ProjectMember: {},
                Task: {},
                Comment: options.commentConfig ?? {},
                AgentRun: {},
                Note: {},
                CycA: {},
                CycB: {},
            },
            accessGraph: options.accessGraph,
        } as any;

        const ormModels = {
            User: UserModel,
            Group: GroupModel,
            Org: OrgModel,
            Project: ProjectModel,
            ProjectMember: ProjectMemberModel,
            Task: TaskModel,
            Comment: CommentModel,
            AgentRun: AgentRunModel,
            Note: NoteModel,
            CycA: CycAModel,
            CycB: CycBModel,
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

        const accessor = (modelName: string, user: Partial<User>, action: ActionType = "list") => {
            const modelResource: ModelResource = {
                name: modelName,
                config: adminizer.config.models[modelName],
                model: adminizer.modelHandler.getResource(modelName),
                uri: `/model/${modelName.toLowerCase()}`,
            };
            return new DataAccessor(adminizer, user as User, modelResource, action);
        };

        return {orm, adminizer, adapter, models: ormModels, accessor};
    }

    const admin: Partial<User> = {id: 900, login: "admin", isAdministrator: true, groups: []};
    const member = (id: number, groups: any[] = []): Partial<User> =>
        ({id, login: `user-${id}`, isAdministrator: false, groups});

    const projectGraph: AdminpanelConfig["accessGraph"] = {
        project: {
            root: "Project",
            membership: {through: "ProjectMember", via: "user"},
            include: {
                Task: {parent: "project"},
                Comment: {parent: "task"},
                AgentRun: {parent: "task"},
            },
        },
    };

    /** Two projects, user 7 a member of p1 only, one task and one comment in each. */
    async function seedTwoProjects(ctx: Awaited<ReturnType<typeof buildContext>>) {
        const p1 = await ctx.models.Project.create({name: "p1"});
        const p2 = await ctx.models.Project.create({name: "p2"});
        await ctx.models.ProjectMember.create({userId: 7, projectId: p1.get("id")});
        const t1 = await ctx.models.Task.create({title: "t1", projectId: p1.get("id")});
        const t2 = await ctx.models.Task.create({title: "t2", projectId: p2.get("id")});
        const c1 = await ctx.models.Comment.create({text: "c1", taskId: t1.get("id"), projectId: p1.get("id")});
        const c2 = await ctx.models.Comment.create({text: "c2", taskId: t2.get("id"), projectId: p2.get("id")});
        return {p1, p2, t1, t2, c1, c2};
    }

    describe("read filtering (sanitizeUserRelationAccess)", () => {
        it("filters the root model by the user's membership root ids", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {p1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Project", member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({id: {in: [p1.get("id")]}});
        });

        it("filters a direct child by the root ids and merges with existing criteria", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {p1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess({where: {title: "t1"}});

            expect(result.where).toEqual({title: "t1", project: {in: [p1.get("id")]}});
        });

        it("filters a transitive model by the intermediate level's ids", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({task: {in: [t1.get("id")]}});
        });

        it("filters actual find() results end to end for the deepest model", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {c1} = await seedTwoProjects(ctx);
            const commentModel = ctx.adminizer.modelHandler.getResource("Comment");

            const records = await commentModel.find({}, ctx.accessor("Comment", member(7))) as any[];

            expect(records.map((r) => r.id)).toEqual([c1.get("id")]);
        });

        it("leaves criteria untouched for an administrator", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", admin).sanitizeUserRelationAccess({where: {text: "x"}});

            expect(result.where).toEqual({text: "x"});
        });

        it("yields empty id lists at every level for a user with no memberships", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            await seedTwoProjects(ctx);

            const task = await ctx.accessor("Task", member(8)).sanitizeUserRelationAccess();
            const comment = await ctx.accessor("Comment", member(8)).sanitizeUserRelationAccess();

            expect(task.where).toEqual({project: {in: []}});
            expect(comment.where).toEqual({task: {in: []}});
        });

        it("leaves models outside every graph untouched", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});

            const result = await ctx.accessor("Note", member(7)).sanitizeUserRelationAccess({where: {text: "x"}});

            expect(result.where).toEqual({text: "x"});
        });

        it("the graph wins over a covered model's own userAccessRelation", async () => {
            const ctx = await buildContext({
                accessGraph: projectGraph,
                commentConfig: {userAccessRelation: "author"},
            });
            const {t1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            // Not {author: 7}: a model cannot opt out of a graph that covers it.
            expect(result.where).toEqual({task: {in: [t1.get("id")]}});
        });

        it("logs a configuration error when a covered model also declares userAccessRelation", async () => {
            const ctx = await buildContext({
                accessGraph: projectGraph,
                commentConfig: {userAccessRelation: "author"},
            });
            // The graph compiles lazily, on the first access
            await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining(
                    'INVALID CONFIGURATION — model "Comment" declares "userAccessRelation" ' +
                    'AND is covered by access graph "project"'
                )
            );
        });

        it("does not leak the graph parent through populate when the model also declares userAccessRelation", async () => {
            const ctx = await buildContext({
                accessGraph: projectGraph,
                commentConfig: {userAccessRelation: "author"},
            });
            const {t2, c2} = await seedTwoProjects(ctx);
            // c2 hangs off t2, whose project user 7 is NOT a member of — but 7 authored it.
            // While `userAccessRelation` won, c2 stayed visible and `isGraphParentEdge` skipped
            // the verification of `Comment.task`, handing out the whole foreign task.
            await ctx.models.Comment.update({authorId: 7}, {where: {id: c2.get("id")}});

            const comments = ctx.adminizer.modelHandler.getResource("Comment")!;
            const records = await comments.find({sort: "id ASC"}, ctx.accessor("Comment", member(7)));

            expect(records.map((record: any) => record.id)).not.toContain(c2.get("id"));
            for (const record of records as any[]) {
                expect(record.task).not.toBe(t2.get("id"));
                expect(record.task?.title).not.toBe("t2");
            }
        });

        it("with membership `group`, only memberships whose group carries the accessed model's CRUD token count", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user", group: "group"},
                        include: {Task: {parent: "project"}, Comment: {parent: "task"}},
                    },
                },
            });
            const reader = await ctx.models.Group.create({name: "reader", tokens: ["read-comment-model"]});
            const editor = await ctx.models.Group.create({
                name: "editor",
                tokens: [{tokenId: "update-comment-model", rights: []}],
            });
            const p1 = await ctx.models.Project.create({name: "p1"});
            const p2 = await ctx.models.Project.create({name: "p2"});
            await ctx.models.ProjectMember.create({userId: 7, projectId: p1.get("id"), groupId: reader.get("id")});
            await ctx.models.ProjectMember.create({userId: 7, projectId: p2.get("id"), groupId: editor.get("id")});
            const t1 = await ctx.models.Task.create({title: "t1", projectId: p1.get("id")});
            const t2 = await ctx.models.Task.create({title: "t2", projectId: p2.get("id")});

            const read = await ctx.accessor("Comment", member(7), "list").sanitizeUserRelationAccess();
            const update = await ctx.accessor("Comment", member(7), "edit").sanitizeUserRelationAccess();

            expect(read.where).toEqual({task: {in: [t1.get("id")]}});
            expect(update.where).toEqual({task: {in: [t2.get("id")]}});
        });

        it("bypassToken on the user's global group lifts the graph filter", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {...projectGraph!.project, bypassToken: "project-admin"},
                },
            });
            await seedTwoProjects(ctx);
            const user = member(8, [{id: 31, name: "supervisors", tokens: ["project-admin"]}]);

            const result = await ctx.accessor("Comment", user).sanitizeUserRelationAccess({where: {text: "x"}});

            expect(result.where).toEqual({text: "x"});
        });

        describe("resolveGraphRootIds", () => {
            it("replaces the membership source when it returns ids", async () => {
                const ctx = await buildContext({
                    accessGraph: {
                        project: {
                            root: "Project",
                            resolveGraphRootIds: async () => [2],
                            include: {Task: {parent: "project"}},
                        },
                    },
                });
                await seedTwoProjects(ctx);

                const result = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();

                expect(result.where).toEqual({project: {in: [2]}});
            });

            it("returning \"all\" is an explicit bypass", async () => {
                const ctx = await buildContext({
                    accessGraph: {
                        project: {
                            root: "Project",
                            resolveGraphRootIds: () => "all" as const,
                            include: {Task: {parent: "project"}},
                        },
                    },
                });
                await seedTwoProjects(ctx);

                const result = await ctx.accessor("Task", member(8)).sanitizeUserRelationAccess({where: {title: "x"}});

                expect(result.where).toEqual({title: "x"});
            });

            it("returning undefined falls back to the declared membership", async () => {
                const ctx = await buildContext({
                    accessGraph: {
                        project: {
                            ...projectGraph!.project,
                            resolveGraphRootIds: () => undefined,
                        },
                    },
                });
                const {p1} = await seedTwoProjects(ctx);

                const result = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();

                expect(result.where).toEqual({project: {in: [p1.get("id")]}});
            });

            it("receives the user and the action's CRUD verb", async () => {
                const resolveGraphRootIds = vi.fn(async () => []);
                const ctx = await buildContext({
                    accessGraph: {
                        project: {
                            root: "Project",
                            resolveGraphRootIds,
                            include: {Task: {parent: "project"}},
                        },
                    },
                });

                await ctx.accessor("Task", member(7), "edit").sanitizeUserRelationAccess();

                expect(resolveGraphRootIds).toHaveBeenCalledWith(expect.objectContaining({id: 7}), "update");
            });
        });
    });

    describe("write path (setUserRelationAccess)", () => {
        it("accepts a parent inside the user's graph and rejects one outside it", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {t1, t2} = await seedTwoProjects(ctx);

            const ok = await ctx.accessor("Comment", member(7), "add")
                .setUserRelationAccess({text: "c", task: t1.get("id")});
            expect(ok.task).toBe(t1.get("id"));

            await expect(
                ctx.accessor("Comment", member(7), "add").setUserRelationAccess({text: "c", task: t2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("validates the direct child of the root against the membership root ids", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            const {p1, p2} = await seedTwoProjects(ctx);

            const ok = await ctx.accessor("Task", member(7), "add")
                .setUserRelationAccess({title: "t", project: p1.get("id")});
            expect(ok.project).toBe(p1.get("id"));

            await expect(
                ctx.accessor("Task", member(7), "add").setUserRelationAccess({title: "t", project: p2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("with membership `group`, the create token on the membership's group gates the parent choice", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user", group: "group"},
                        include: {Task: {parent: "project"}, Comment: {parent: "task"}},
                    },
                },
            });
            const creator = await ctx.models.Group.create({name: "creator", tokens: ["create-comment-model"]});
            const reader = await ctx.models.Group.create({name: "reader", tokens: ["read-comment-model"]});
            const p1 = await ctx.models.Project.create({name: "p1"});
            const p2 = await ctx.models.Project.create({name: "p2"});
            await ctx.models.ProjectMember.create({userId: 7, projectId: p1.get("id"), groupId: creator.get("id")});
            await ctx.models.ProjectMember.create({userId: 7, projectId: p2.get("id"), groupId: reader.get("id")});
            const t1 = await ctx.models.Task.create({title: "t1", projectId: p1.get("id")});
            const t2 = await ctx.models.Task.create({title: "t2", projectId: p2.get("id")});

            const ok = await ctx.accessor("Comment", member(7), "add")
                .setUserRelationAccess({text: "c", task: t1.get("id")});
            expect(ok.task).toBe(t1.get("id"));

            await expect(
                ctx.accessor("Comment", member(7), "add").setUserRelationAccess({text: "c", task: t2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("passes records through untouched for administrators and for the root model", async () => {
            const ctx = await buildContext({accessGraph: projectGraph});
            await seedTwoProjects(ctx);

            const adminRecord = await ctx.accessor("Comment", admin, "add")
                .setUserRelationAccess({text: "c", task: 12345});
            expect(adminRecord.task).toBe(12345);

            const rootRecord = await ctx.accessor("Project", member(7), "add")
                .setUserRelationAccess({name: "new project"});
            expect(rootRecord).toEqual({name: "new project"});
        });
    });

    describe("graph validation", () => {
        it("a model claimed by two graphs fails closed with both graph keys", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: projectGraph!.project,
                    org: {
                        root: "Org",
                        resolveGraphRootIds: () => [],
                        include: {Task: {parent: "project"}},
                    },
                },
            });

            await expect(ctx.accessor("Task", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/more than one access graph \("project", "org"\)/);
            expect(() => validateAccessGraph(ctx.adminizer)).toThrow(/more than one access graph/);
        });

        it("a cycle that never reaches the root fails closed", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {CycA: {parent: "peer"}, CycB: {parent: "peer"}},
                    },
                },
            });

            await expect(ctx.accessor("CycA", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/cycle detected/);
        });

        it("an edge that is not a model association fails closed", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {Task: {parent: "title"}},
                    },
                },
            });

            await expect(ctx.accessor("Task", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/is not a model association/);
        });

        it("an edge pointing outside the graph fails closed", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {Comment: {parent: "author"}},
                    },
                },
            });

            await expect(ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/not part of the graph/);
        });

        it("a graph with neither membership nor resolveGraphRootIds fails closed", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        include: {Task: {parent: "project"}},
                    },
                },
            });

            await expect(ctx.accessor("Task", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/neither "membership" nor "resolveGraphRootIds"/);
        });

        it("a missing membership model fails closed", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "Nowhere", via: "user"},
                        include: {Task: {parent: "project"}},
                    },
                },
            });

            await expect(ctx.accessor("Task", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/membership model "Nowhere" not found/);
        });

        it("an unregistered root model fails closed", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Nope",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {Task: {parent: "project"}},
                    },
                },
            });

            await expect(ctx.accessor("Task", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/root model "Nope" is not registered/);
        });

        it("an unregistered include model stays outside the graph without breaking the rest", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {Task: {parent: "project"}, Ghost: {parent: "project"}},
                    },
                },
            });
            const {p1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({project: {in: [p1.get("id")]}});
            expect(() => validateAccessGraph(ctx.adminizer)).not.toThrow();
        });

        it("validateAccessGraph aggregates every structural problem", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user"},
                        include: {Task: {parent: "title"}, Comment: {parent: "author"}},
                    },
                },
            });

            expect(() => validateAccessGraph(ctx.adminizer)).toThrow(
                /Invalid accessGraph configuration:(.|\n)*Task\.title(.|\n)*Comment\.author/
            );
        });
    });

    describe("runtime registry and config changes", () => {
        it("an include model registered after the first compile joins the graph instead of staying outside it", async () => {
            const ctx = await buildContext({accessGraph: projectGraph, skipModels: ["AgentRun"]});
            const {p1, t1} = await seedTwoProjects(ctx);

            // First access compiles the graph while AgentRun is missing (fail-soft warn)
            const task = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(task.where).toEqual({project: {in: [p1.get("id")]}});

            ctx.adminizer.modelHandler.add("AgentRun", new ctx.adapter.Model("AgentRun", ctx.models.AgentRun));

            const result = await ctx.accessor("AgentRun", member(7)).sanitizeUserRelationAccess();
            expect(result.where).toEqual({task: {in: [t1.get("id")]}});
        });

        it("a host model registered after boot joins the internal allowlist", async () => {
            // Hosts that bind their models after adminizer.init() (a late model collection,
            // not an app) go through modelHandler.add, which fires no app:model:* event.
            const ctx = await buildContext({accessGraph: projectGraph, skipModels: ["ProjectMember"]});
            const {p1} = await seedTwoProjects(ctx);

            ctx.adminizer.modelHandler.add(
                "ProjectMember",
                new ctx.adapter.Model("ProjectMember", ctx.models.ProjectMember)
            );

            const task = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(task.where).toEqual({project: {in: [p1.get("id")]}});
        });

        it("an app model registered at runtime joins the graph and the internal allowlist", async () => {
            const ctx = await buildContext({accessGraph: projectGraph, skipModels: ["Task"]});
            const {p1, t1} = await seedTwoProjects(ctx);

            // Compiled without Task: Comment's edge target is unresolved and fails closed
            await expect(ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/targets "Task", which is not registered/);

            const resourceId = ctx.adminizer.modelHandler
                .register("crm-app", "Task", new ctx.adapter.Model("Task", ctx.models.Task));
            ctx.adminizer.emitter.emit("app:model:registered", {appName: "crm-app", resourceId, modelName: "Task"});

            const task = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(task.where).toEqual({project: {in: [p1.get("id")]}});
            const comment = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();
            expect(comment.where).toEqual({task: {in: [t1.get("id")]}});
        });

        it("an accessGraph patched in via a config layer restricts its models and refreshes the internal allowlist", async () => {
            const ctx = await buildContext({});
            const {p1, t1} = await seedTwoProjects(ctx);

            const before = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess({where: {title: "x"}});
            expect(before.where).toEqual({title: "x"});

            ctx.adminizer.configLayerHandler.register("crm-app", "graph", {accessGraph: projectGraph} as any);

            const task = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(task.where).toEqual({project: {in: [p1.get("id")]}});
            const comment = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();
            expect(comment.where).toEqual({task: {in: [t1.get("id")]}});
        });

        it("survives an app enable → disable → enable cycle", async () => {
            const ctx = await buildContext({skipModels: ["Task"]});
            const {p1} = await seedTwoProjects(ctx);

            // Mirrors AppManager: enable registers the config layer, then the models;
            // disable runs the disposers in reverse order.
            const enableApp = () => {
                ctx.adminizer.configLayerHandler.register("crm-app", "graph", {accessGraph: projectGraph} as any);
                const resourceId = ctx.adminizer.modelHandler
                    .register("crm-app", "Task", new ctx.adapter.Model("Task", ctx.models.Task));
                ctx.adminizer.emitter.emit("app:model:registered", {appName: "crm-app", resourceId, modelName: "Task"});
                return resourceId;
            };
            const disableApp = (resourceId: string) => {
                ctx.adminizer.modelHandler.unregister(resourceId);
                ctx.adminizer.emitter.emit("app:model:unregistered", {appName: "crm-app", resourceId, modelName: "Task"});
                ctx.adminizer.configLayerHandler.unregister("crm-app:graph");
            };

            const firstId = enableApp();
            const enabled = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(enabled.where).toEqual({project: {in: [p1.get("id")]}});

            disableApp(firstId);
            const disabled = await ctx.accessor("Project", member(7)).sanitizeUserRelationAccess({where: {name: "x"}});
            expect(disabled.where).toEqual({name: "x"});

            enableApp();
            const reenabled = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(reenabled.where).toEqual({project: {in: [p1.get("id")]}});
        });
    });

    describe("graphRootField (stage 2)", () => {
        const rootFieldGraph: AdminpanelConfig["accessGraph"] = {
            project: {
                ...projectGraph!.project,
                graphRootField: {Comment: "projectId"},
            },
        };

        it("collapses the read filter to the denormalized root-id column", async () => {
            const ctx = await buildContext({accessGraph: rootFieldGraph});
            const {p1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({projectId: {in: [p1.get("id")]}});
        });

        it("walks no intermediate level and still finds the right rows", async () => {
            const queries: string[] = [];
            const ctx = await buildContext({accessGraph: rootFieldGraph, queries});
            const {c1} = await seedTwoProjects(ctx);

            const before = queries.length;
            await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();
            const walkQueries = queries.slice(before);

            // one membership lookup, nothing on the intermediate Task level
            expect(walkQueries.some((sql) => sql.includes("`ProjectMembers`"))).toBe(true);
            expect(walkQueries.some((sql) => sql.includes("`Tasks`"))).toBe(false);

            const commentModel = ctx.adminizer.modelHandler.getResource("Comment");
            const records = await commentModel.find({}, ctx.accessor("Comment", member(7))) as any[];
            expect(records.map((r) => r.id)).toEqual([c1.get("id")]);
        });

        it("shortcuts an intermediate level for the models below it", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        ...projectGraph!.project,
                        graphRootField: {Task: "projectId"},
                    },
                },
            });
            const {t1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({task: {in: [t1.get("id")]}});
        });

        it("keeps validating the parent edge on writes", async () => {
            const ctx = await buildContext({accessGraph: rootFieldGraph});
            const {t2} = await seedTwoProjects(ctx);

            await expect(
                ctx.accessor("Comment", member(7), "add").setUserRelationAccess({text: "c", task: t2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("rejects a graphRootField for a model outside the graph and an unknown column", async () => {
            const outside = await buildContext({
                accessGraph: {
                    project: {...projectGraph!.project, graphRootField: {Note: "text"}},
                },
            });
            expect(() => validateAccessGraph(outside.adminizer))
                .toThrow(/graphRootField declared for "Note"/);

            const unknownColumn = await buildContext({
                accessGraph: {
                    project: {...projectGraph!.project, graphRootField: {Comment: "nope"}},
                },
            });
            expect(() => validateAccessGraph(unknownColumn.adminizer))
                .toThrow(/graphRootField "Comment\.nope" does not exist/);
        });
    });

    describe("pushdown (stage 3)", () => {
        const pushdownGraph: AdminpanelConfig["accessGraph"] = {
            project: {
                ...projectGraph!.project,
                pushdown: true,
            },
        };

        const literalSql = (operand: unknown): string => {
            expect(operand).toHaveProperty("val");
            return String((operand as {val: unknown}).val);
        };

        it("compiles the transitive filter into one nested subquery", async () => {
            const ctx = await buildContext({accessGraph: pushdownGraph});
            await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            const sql = literalSql((result.where as any).task.in);
            expect(sql).toContain("FROM `Tasks`");
            expect(sql).toContain("FROM `ProjectMembers`");
        });

        it("materializes nothing in the app: the walk itself runs zero queries", async () => {
            const queries: string[] = [];
            const ctx = await buildContext({accessGraph: pushdownGraph, queries});
            const {c1} = await seedTwoProjects(ctx);

            const before = queries.length;
            await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();
            expect(queries.slice(before)).toHaveLength(0);

            // the membership lookup runs only inside the main find, as a nested subquery
            const commentModel = ctx.adminizer.modelHandler.getResource("Comment");
            const findStart = queries.length;
            const records = await commentModel.find({}, ctx.accessor("Comment", member(7))) as any[];
            expect(records.map((r) => r.id)).toEqual([c1.get("id")]);
            const membershipQueries = queries.slice(findStart).filter((sql) => sql.includes("`ProjectMembers`"));
            expect(membershipQueries).toHaveLength(1);
            expect(membershipQueries[0]).toContain("FROM `Comments`");
        });

        it("filters the root through the membership subquery", async () => {
            const ctx = await buildContext({accessGraph: pushdownGraph});
            const {p1} = await seedTwoProjects(ctx);
            const projectModel = ctx.adminizer.modelHandler.getResource("Project");

            const records = await projectModel.find({}, ctx.accessor("Project", member(7))) as any[];

            expect(records.map((r) => r.id)).toEqual([p1.get("id")]);
        });

        it("narrows the membership subquery by the groups granting the action's token", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        membership: {through: "ProjectMember", via: "user", group: "group"},
                        include: {Task: {parent: "project"}, Comment: {parent: "task"}},
                        pushdown: true,
                    },
                },
            });
            const reader = await ctx.models.Group.create({name: "reader", tokens: ["read-comment-model"]});
            const editor = await ctx.models.Group.create({name: "editor", tokens: ["update-comment-model"]});
            const p1 = await ctx.models.Project.create({name: "p1"});
            const p2 = await ctx.models.Project.create({name: "p2"});
            await ctx.models.ProjectMember.create({userId: 7, projectId: p1.get("id"), groupId: reader.get("id")});
            await ctx.models.ProjectMember.create({userId: 7, projectId: p2.get("id"), groupId: editor.get("id")});
            const t1 = await ctx.models.Task.create({title: "t1", projectId: p1.get("id")});
            const t2 = await ctx.models.Task.create({title: "t2", projectId: p2.get("id")});
            const c1 = await ctx.models.Comment.create({text: "c1", taskId: t1.get("id")});
            await ctx.models.Comment.create({text: "c2", taskId: t2.get("id")});
            const commentModel = ctx.adminizer.modelHandler.getResource("Comment");

            const read = await ctx.accessor("Comment", member(7), "list").sanitizeUserRelationAccess();
            const records = await commentModel.find({}, ctx.accessor("Comment", member(7), "list")) as any[];

            expect(literalSql((read.where as any).task.in)).toContain("`groupId` IN");
            expect(records.map((r) => r.id)).toEqual([c1.get("id")]);
        });

        it("combined with graphRootField the subquery reads only the membership table", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        ...projectGraph!.project,
                        graphRootField: {Comment: "projectId"},
                        pushdown: true,
                    },
                },
            });
            const {c1} = await seedTwoProjects(ctx);

            const result = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            const sql = literalSql((result.where as any).projectId.in);
            expect(sql).toContain("FROM `ProjectMembers`");
            expect(sql).not.toContain("`Tasks`");

            const commentModel = ctx.adminizer.modelHandler.getResource("Comment");
            const records = await commentModel.find({}, ctx.accessor("Comment", member(7))) as any[];
            expect(records.map((r) => r.id)).toEqual([c1.get("id")]);
        });

        it("custom-resolved ids stay a plain IN list; \"all\" stays a bypass", async () => {
            const ctx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        resolveGraphRootIds: () => [2],
                        include: {Task: {parent: "project"}},
                        pushdown: true,
                    },
                },
            });
            const idsResult = await ctx.accessor("Task", member(7)).sanitizeUserRelationAccess();
            expect(idsResult.where).toEqual({project: {in: [2]}});

            const allCtx = await buildContext({
                accessGraph: {
                    project: {
                        root: "Project",
                        resolveGraphRootIds: () => "all" as const,
                        include: {Task: {parent: "project"}},
                        pushdown: true,
                    },
                },
            });
            const allResult = await allCtx.accessor("Task", member(8)).sanitizeUserRelationAccess({where: {title: "x"}});
            expect(allResult.where).toEqual({title: "x"});
        });

        /**
         * A fallback is invisible in the result — same records, one query per level instead of a
         * subquery — so the warning is the only thing that tells an operator the flag is inert.
         */
        it("warns once, naming the model and the reason, when the chain cannot be compiled", async () => {
            const ctx = await buildContext({accessGraph: pushdownGraph});
            await seedTwoProjects(ctx);
            // an (empty) defaultScope: the adapter refuses to reproduce one in raw SQL
            (ctx.models.Task as any).options.defaultScope = {where: {}};
            logger.warn.mockClear();

            const first = await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();
            await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            const notices = logger.warn.mock.calls
                .map((call) => String(call[0]))
                .filter((message) => message.includes("pushdown"));
            expect(notices).toHaveLength(1);
            expect(notices[0]).toContain(`graph "project"`);
            expect(notices[0]).toContain(`"Comment"`);
            expect(notices[0]).toContain("defaultScope");
            // and the filter itself still confines the records, materialized
            expect(first.where).toEqual({task: {in: [(await ctx.models.Task.findOne({where: {title: "t1"}}))!.get("id")]}});
        });

        it("stays silent when the chain compiles", async () => {
            const ctx = await buildContext({accessGraph: pushdownGraph});
            await seedTwoProjects(ctx);
            logger.warn.mockClear();

            await ctx.accessor("Comment", member(7)).sanitizeUserRelationAccess();

            expect(logger.warn.mock.calls.map((call) => String(call[0])).join("\n")).not.toContain("pushdown");
        });

        it("write validation still rejects a foreign parent", async () => {
            const ctx = await buildContext({accessGraph: pushdownGraph});
            const {t1, t2} = await seedTwoProjects(ctx);

            const ok = await ctx.accessor("Comment", member(7), "add")
                .setUserRelationAccess({text: "c", task: t1.get("id")});
            expect(ok.task).toBe(t1.get("id"));

            await expect(
                ctx.accessor("Comment", member(7), "add").setUserRelationAccess({text: "c", task: t2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });
    });

    describe("experimental notice", () => {
        it("warns once per compile, naming the configured graphs", async () => {
            logger.warn.mockClear();
            const ctx = await buildContext({accessGraph: projectGraph});

            validateAccessGraph(ctx.adminizer);
            validateAccessGraph(ctx.adminizer);

            const notices = logger.warn.mock.calls
                .map((call) => String(call[0]))
                .filter((message) => message.includes("EXPERIMENTAL"));
            expect(notices).toHaveLength(1);
            expect(notices[0]).toContain("[accessGraph]");
            expect(notices[0]).toContain("project");
        });

        it("stays silent when no graph is configured", async () => {
            logger.warn.mockClear();
            const ctx = await buildContext();

            validateAccessGraph(ctx.adminizer);

            expect(logger.warn.mock.calls.map((call) => String(call[0])).join("\n"))
                .not.toContain("EXPERIMENTAL");
        });
    });
});
