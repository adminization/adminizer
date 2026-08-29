import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {Adminizer} from "../src/lib/Adminizer";
import {DataAccessor} from "../src/lib/DataAccessor";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {ModelResource} from "../src/interfaces/types";
import {ActionType, ModelConfig} from "../src/interfaces/adminpanelConfig";
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

describe("DataAccessor", () => {
    const sequelizeConnections: Sequelize[] = [];

    afterEach(async () => {
        await Promise.all(sequelizeConnections.splice(0).map((orm) => orm.close()));
    });

    /**
     * One schema serves every form of `userAccessRelation`:
     *  - Task.owner  → User            (string form, User)
     *  - Task.team   → Group           (string form, Group)
     *  - Task.project → Project.owner  (object form {field, via})
     *  - Task.project ← ProjectMember(user, project, group)  (membership form {field, through, via, group})
     *  - BadMember has two Project relations to exercise the ambiguity error.
     */
    async function buildContext(options: {
        taskConfig?: ModelConfig,
        projectConfig?: ModelConfig,
        authEnabled?: boolean,
        registration?: {defaultUserGroup?: string},
    } = {}) {
        const orm = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: false,
        });
        sequelizeConnections.push(orm);

        const UserModel = orm.define("User", {
            login: DataTypes.STRING,
        });
        const GroupModel = orm.define("Group", {
            name: DataTypes.STRING,
            tokens: DataTypes.JSON,
        });
        const ProjectModel = orm.define("Project", {
            name: DataTypes.STRING,
        });
        const ProjectMemberModel = orm.define("ProjectMember", {});
        const BadMemberModel = orm.define("BadMember", {});
        const TaskModel = orm.define("Task", {
            title: DataTypes.STRING,
            secret: DataTypes.STRING,
            dueDate: DataTypes.DATE,
            code: {type: DataTypes.STRING, allowNull: false, defaultValue: ""},
        });

        ProjectModel.belongsTo(UserModel, {foreignKey: "ownerId", as: "owner"});
        ProjectMemberModel.belongsTo(UserModel, {foreignKey: "userId", as: "user"});
        ProjectMemberModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        ProjectMemberModel.belongsTo(GroupModel, {foreignKey: "groupId", as: "group"});
        BadMemberModel.belongsTo(UserModel, {foreignKey: "userId", as: "user"});
        BadMemberModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        BadMemberModel.belongsTo(ProjectModel, {foreignKey: "altProjectId", as: "altProject"});
        TaskModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        TaskModel.belongsTo(UserModel, {foreignKey: "ownerId", as: "owner"});
        TaskModel.belongsTo(GroupModel, {foreignKey: "teamId", as: "team"});
        // Collection relations for the collection form of `userAccessRelation`
        TaskModel.hasMany(UserModel, {foreignKey: "watchedTaskId", as: "watchers"});
        TaskModel.hasMany(GroupModel, {foreignKey: "teamTaskId", as: "teams"});

        await orm.sync({force: true});

        // sqlite enforces the FKs above, so the acting users must exist as rows
        await UserModel.create({id: 7, login: "u7"});
        await UserModel.create({id: 8, login: "u8"});

        const adapter = new SequelizeAdapter(orm);
        const adminizer = new Adminizer([adapter]);
        adminizer.config = {
            routePrefix: "",
            auth: {enable: options.authEnabled ?? false},
            registration: options.registration,
            models: {
                User: {},
                Group: {},
                Project: options.projectConfig ?? {},
                ProjectMember: {},
                BadMember: {},
                Task: options.taskConfig ?? {},
            },
        } as any;

        const taskModel = new adapter.Model("Task", TaskModel);
        adminizer.modelHandler.add("User", new adapter.Model("User", UserModel));
        adminizer.modelHandler.add("Group", new adapter.Model("Group", GroupModel));
        adminizer.modelHandler.add("Project", new adapter.Model("Project", ProjectModel));
        adminizer.modelHandler.add("ProjectMember", new adapter.Model("ProjectMember", ProjectMemberModel));
        adminizer.modelHandler.add("BadMember", new adapter.Model("BadMember", BadMemberModel));
        adminizer.modelHandler.add("Task", taskModel);
        adminizer.modelHandler.configureInternalAccess({
            "data-accessor": ["Project", "ProjectMember", "BadMember", "Group"],
        });

        const modelResource: ModelResource = {
            name: "Task",
            config: adminizer.config.models.Task,
            model: taskModel,
            uri: "/model/task",
        };

        const accessor = (user: Partial<User>, action: ActionType = "list") =>
            new DataAccessor(adminizer, user as User, modelResource, action);

        return {
            orm,
            adminizer,
            adapter,
            taskModel,
            models: {UserModel, GroupModel, ProjectModel, ProjectMemberModel, BadMemberModel, TaskModel},
            accessor,
        };
    }

    const admin: Partial<User> = {id: 900, login: "admin", isAdministrator: true, groups: []};
    const member = (id: number, groups: any[] = []): Partial<User> =>
        ({id, login: `user-${id}`, isAdministrator: false, groups});

    /** Hand-built resource for branches a real ORM schema cannot produce (broken declarations). */
    const fakeAccessor = (
        ctx: {adminizer: Adminizer},
        resource: {attributes?: Record<string, any>, config?: ModelConfig},
        user: Partial<User>,
        action: ActionType = "list",
    ) => new DataAccessor(ctx.adminizer, user as User, {
        name: "Fake",
        config: resource.config ?? {},
        model: {attributes: resource.attributes, primaryKey: "id"} as any,
        uri: "/model/fake",
    }, action);

    describe("sanitizeUserRelationAccess", () => {
        it("leaves criteria untouched for an administrator", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});
            const criteria = {where: {title: "x"}};

            const result = await ctx.accessor(admin).sanitizeUserRelationAccess(criteria);

            expect(result.where).toEqual({title: "x"});
        });

        it("folds a flat criteria into `where`, so the access filter cannot widen it", async () => {
            // Adapters read field conditions from `where` when it has keys and from the top
            // level otherwise: injecting the access filter must not orphan a flat `{id}`,
            // or a single-record update would hit every record the user may reach.
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess({id: 3} as never);

            expect(result.where).toEqual({id: 3, owner: 7});
            expect(result).not.toHaveProperty("id");
        });

        it("keeps query options out of the where fragment", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess({
                title: "x",
                limit: 10,
                skip: 5,
                sort: "title ASC",
                select: ["id"],
            } as never);

            expect(result).toEqual({
                limit: 10,
                skip: 5,
                sort: "title ASC",
                select: ["id"],
                where: {title: "x", owner: 7},
            });
        });

        it("string form pointing at User filters by the user's id and merges with existing where", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess({where: {title: "x"}});

            expect(result.where).toEqual({title: "x", owner: 7});
        });

        it("string form pointing at Group filters by the user's group ids", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "team"}});
            const user = member(7, [{id: 21, name: "a"}, {id: 22, name: "b"}]);

            const result = await ctx.accessor(user).sanitizeUserRelationAccess();

            expect(result.where).toEqual({team: {in: [21, 22]}});
        });

        it("string form naming a non-relation field throws", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "title"}});

            await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/Invalid userAccessRelation configuration/);
        });

        it("{field, via} form filters by intermediate records owned by the user", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", via: "owner"}},
            });
            const mine = await ctx.models.ProjectModel.create({name: "mine", ownerId: 7});
            await ctx.models.ProjectModel.create({name: "foreign", ownerId: 8});

            const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({project: {in: [mine.get("id")]}});
        });

        it("{field, via} form with a via that is not a User relation throws", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", via: "name"}},
            });

            await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/only relations to "User" are supported/);
        });

        it("returns criteria unchanged when the model has no userAccessRelation", async () => {
            const ctx = await buildContext();
            const criteria = {where: {title: "x"}};

            const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess(criteria);

            expect(result.where).toBe(criteria.where);
        });

        it("wraps a non-plain criteria.where into an and-combination", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});
            class OrmWhere { title = "x"; }

            const result = await ctx.accessor(member(7))
                .sanitizeUserRelationAccess({where: new OrmWhere() as any});

            expect(result.where).toEqual({and: [{title: "x"}, {owner: 7}]});
        });

        it("collection form pointing at User builds a `contains` filter", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "watchers"}});

            const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess();

            expect(result.where).toEqual({watchers: {contains: 7}});
        });

        it("collection form pointing at Group builds an `intersects` filter", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "teams"}});
            const user = member(7, [{id: 21, name: "a"}, {id: 22, name: "b"}]);

            const result = await ctx.accessor(user).sanitizeUserRelationAccess();

            expect(result.where).toEqual({teams: {intersects: [21, 22]}});
        });

        it("{field, via} form with an unknown field throws", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "nope", via: "owner"}},
            });

            await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                .rejects.toThrow(/Invalid intermediate relation configuration for field "nope"/);
        });

        it("{field, via} form with an unregistered intermediate model throws", async () => {
            const ctx = await buildContext();
            const accessor = fakeAccessor(ctx, {
                attributes: {project: {model: "Nowhere"}},
                config: {userAccessRelation: {field: "project", via: "owner"}},
            }, member(7));

            await expect(accessor.sanitizeUserRelationAccess())
                .rejects.toThrow(/Intermediate model "Nowhere" not found/);
        });

        describe("membership form {field, through, via}", () => {
            it("filters by the targets the user has a membership row for", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
                });
                const p1 = await ctx.models.ProjectModel.create({name: "p1"});
                const p2 = await ctx.models.ProjectModel.create({name: "p2"});
                await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id")});
                await ctx.models.ProjectMemberModel.create({userId: 8, projectId: p2.get("id")});

                const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess();

                expect(result.where).toEqual({project: {in: [p1.get("id")]}});
            });

            it("yields an empty target list for a user with no memberships", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
                });
                await ctx.models.ProjectModel.create({name: "p1"});

                const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess();

                expect(result.where).toEqual({project: {in: []}});
            });

            it("filters actual find() results end to end", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
                });
                const p1 = await ctx.models.ProjectModel.create({name: "p1"});
                const p2 = await ctx.models.ProjectModel.create({name: "p2"});
                await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id")});
                const visible = await ctx.models.TaskModel.create({title: "visible", projectId: p1.get("id")});
                await ctx.models.TaskModel.create({title: "hidden", projectId: p2.get("id")});

                const records = await ctx.taskModel.find({}, ctx.accessor(member(7))) as any[];

                expect(records.map((r) => r.id)).toEqual([visible.get("id")]);
            });

            it("with `group`, only memberships whose group carries the action's CRUD token count", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user", group: "group"}},
                });
                const reader = await ctx.models.GroupModel.create({name: "reader", tokens: ["read-task-model"]});
                const editor = await ctx.models.GroupModel.create({
                    name: "editor",
                    tokens: [{tokenId: "update-task-model", rights: []}],
                });
                const p1 = await ctx.models.ProjectModel.create({name: "p1"});
                const p2 = await ctx.models.ProjectModel.create({name: "p2"});
                await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id"), groupId: reader.get("id")});
                await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p2.get("id"), groupId: editor.get("id")});

                const read = await ctx.accessor(member(7), "list").sanitizeUserRelationAccess();
                const update = await ctx.accessor(member(7), "edit").sanitizeUserRelationAccess();

                expect(read.where).toEqual({project: {in: [p1.get("id")]}});
                expect(update.where).toEqual({project: {in: [p2.get("id")]}});
            });

            it("with `group`, memberships whose group grants nothing for the action yield no targets", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user", group: "group"}},
                });
                const unrelated = await ctx.models.GroupModel.create({name: "unrelated", tokens: ["read-other-model"]});
                const p1 = await ctx.models.ProjectModel.create({name: "p1"});
                await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id"), groupId: unrelated.get("id")});

                const result = await ctx.accessor(member(7), "list").sanitizeUserRelationAccess();

                expect(result.where).toEqual({project: {in: []}});
            });

            it("throws when the membership model is unknown", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "Nowhere", via: "user"}},
                });

                await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                    .rejects.toThrow(/Membership model "Nowhere" not found/);
            });

            it("throws when the membership model's target relation is ambiguous", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "BadMember", via: "user"}},
                });

                await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                    .rejects.toThrow(/expected exactly one relation to "Project", found 2/);
            });

            it("throws when `group` does not point at Group", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user", group: "project"}},
                });

                await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                    .rejects.toThrow(/a relation to "Group" is required/);
            });

            it("throws when `via` is missing", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember"} as any},
                });

                await expect(ctx.accessor(member(7)).sanitizeUserRelationAccess())
                    .rejects.toThrow(/"via" is required/);
            });

            it("with `group`, membership rows without a group yield no targets", async () => {
                const ctx = await buildContext({
                    taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user", group: "group"}},
                });
                const p1 = await ctx.models.ProjectModel.create({name: "p1"});
                await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id")});

                const result = await ctx.accessor(member(7)).sanitizeUserRelationAccess();

                expect(result.where).toEqual({project: {in: []}});
            });
        });
    });

    describe("setUserRelationAccess", () => {
        it("string form pointing at User overwrites the field with the current user for non-admins", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const record = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", owner: 999});

            expect(record.owner).toBe(7);
        });

        it("string form pointing at User keeps the provided value for administrators", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const record = await ctx.accessor(admin, "add")
                .setUserRelationAccess({title: "t", owner: 999});

            expect(record.owner).toBe(999);
        });

        it("string form pointing at Group assigns the user's single group and rejects multiple", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "team"}});

            const record = await ctx.accessor(member(7, [{id: 21, name: "a"}]), "add")
                .setUserRelationAccess({title: "t"});
            expect(record.team).toBe(21);

            await expect(
                ctx.accessor(member(7, [{id: 21, name: "a"}, {id: 22, name: "b"}]), "add")
                    .setUserRelationAccess({title: "t"})
            ).rejects.toThrow(/none or multiple groups/);
        });

        it("{field, via} form accepts an intermediate owned by the user and rejects a foreign one", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", via: "owner"}},
            });
            const mine = await ctx.models.ProjectModel.create({name: "mine", ownerId: 7});
            const foreign = await ctx.models.ProjectModel.create({name: "foreign", ownerId: 8});

            const ok = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", project: mine.get("id")});
            expect(ok.project).toBe(mine.get("id"));

            await expect(
                ctx.accessor(member(7), "add").setUserRelationAccess({title: "t", project: foreign.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("membership form accepts a target the user is a member of and rejects the rest", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
            });
            const p1 = await ctx.models.ProjectModel.create({name: "p1"});
            const p2 = await ctx.models.ProjectModel.create({name: "p2"});
            await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id")});

            const ok = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", project: p1.get("id")});
            expect(ok.project).toBe(p1.get("id"));

            await expect(
                ctx.accessor(member(7), "add").setUserRelationAccess({title: "t", project: p2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("membership form with `group` requires the create token on the membership's group", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user", group: "group"}},
            });
            const creator = await ctx.models.GroupModel.create({name: "creator", tokens: ["create-task-model"]});
            const reader = await ctx.models.GroupModel.create({name: "reader", tokens: ["read-task-model"]});
            const p1 = await ctx.models.ProjectModel.create({name: "p1"});
            const p2 = await ctx.models.ProjectModel.create({name: "p2"});
            await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id"), groupId: creator.get("id")});
            await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p2.get("id"), groupId: reader.get("id")});

            const ok = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", project: p1.get("id")});
            expect(ok.project).toBe(p1.get("id"));

            await expect(
                ctx.accessor(member(7), "add").setUserRelationAccess({title: "t", project: p2.get("id")})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("passes records through untouched for administrators in the membership form", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
            });

            const record = await ctx.accessor(admin, "add")
                .setUserRelationAccess({title: "t", project: 12345});

            expect(record.project).toBe(12345);
        });

        it("returns the record unchanged when no userAccessRelation is configured", async () => {
            const ctx = await buildContext();

            const record = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", owner: 999});

            expect(record).toEqual({title: "t", owner: 999});
        });

        it("string form pointing at User assigns the current user when the field is empty", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const record = await ctx.accessor(member(7), "add").setUserRelationAccess({title: "t"});

            expect(record.owner).toBe(7);
        });

        it("string form pointing at User leaves an admin record without the field untouched", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "owner"}});

            const record = await ctx.accessor(admin, "add").setUserRelationAccess({title: "t"});

            expect(record).toEqual({title: "t"});
        });

        it("string form pointing at Group throws for a user with no groups", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "team"}});

            await expect(ctx.accessor(member(7, []), "add").setUserRelationAccess({title: "t"}))
                .rejects.toThrow(/none or multiple groups/);
        });

        it("string form pointing at a non-User/Group relation strips the value for non-admins only", async () => {
            const ctx = await buildContext({taskConfig: {userAccessRelation: "project"}});

            const record = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", project: 5});
            expect(record).not.toHaveProperty("project");

            const adminRecord = await ctx.accessor(admin, "add")
                .setUserRelationAccess({title: "t", project: 5});
            expect(adminRecord.project).toBe(5);
        });

        it("{field, via} form accepts a populated object and matches it by primary key", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", via: "owner"}},
            });
            const mine = await ctx.models.ProjectModel.create({name: "mine", ownerId: 7});
            const foreign = await ctx.models.ProjectModel.create({name: "foreign", ownerId: 8});

            const ok = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", project: {id: mine.get("id")}});
            expect(ok.project).toEqual({id: mine.get("id")});

            await expect(
                ctx.accessor(member(7), "add")
                    .setUserRelationAccess({title: "t", project: {id: foreign.get("id")}})
            ).rejects.toThrow(/does not belong to the current user/);
        });

        it("{field, via} form throws when `via` is missing and a value is provided", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project"} as any},
            });

            await expect(
                ctx.accessor(member(7), "add").setUserRelationAccess({title: "t", project: 1})
            ).rejects.toThrow(/"via" is required/);
        });

        it("{field, via} form with a via that is not a User relation throws", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", via: "name"}},
            });

            await expect(
                ctx.accessor(member(7), "add").setUserRelationAccess({title: "t", project: 1})
            ).rejects.toThrow(/only relations to "User" are supported/);
        });

        it("{field, via} form with an unregistered intermediate model throws", async () => {
            const ctx = await buildContext();
            const accessor = fakeAccessor(ctx, {
                attributes: {project: {model: "Nowhere"}},
                config: {userAccessRelation: {field: "project", via: "owner"}},
            }, member(7), "add");

            await expect(accessor.setUserRelationAccess({title: "t", project: 1}))
                .rejects.toThrow(/Intermediate model "Nowhere" not found/);
        });

        it("membership form accepts a populated object value", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
            });
            const p1 = await ctx.models.ProjectModel.create({name: "p1"});
            await ctx.models.ProjectMemberModel.create({userId: 7, projectId: p1.get("id")});

            const ok = await ctx.accessor(member(7), "add")
                .setUserRelationAccess({title: "t", project: {id: p1.get("id")}});

            expect(ok.project).toEqual({id: p1.get("id")});
        });

        it("membership form leaves the record unchanged when no target value is provided", async () => {
            const ctx = await buildContext({
                taskConfig: {userAccessRelation: {field: "project", through: "ProjectMember", via: "user"}},
            });

            const record = await ctx.accessor(member(7), "add").setUserRelationAccess({title: "t"});

            expect(record).toEqual({title: "t"});
        });
    });

    describe("getFieldsConfig", () => {
        it("returns undefined when auth is enabled and the user lacks the model's CRUD token", async () => {
            const ctx = await buildContext({authEnabled: true});

            expect(ctx.accessor(member(7)).getFieldsConfig()).toBeUndefined();
        });

        it("returns fields when the user's group carries the registered CRUD token", async () => {
            const ctx = await buildContext({authEnabled: true});
            ctx.adminizer.accessRightsHelper.registerToken({
                id: "read-Task-model", name: "Read", description: "read", department: "test",
            });
            const user = member(7, [{id: 1, name: "g", tokens: ["read-task-model"]}]);

            const fields = ctx.accessor(user).getFieldsConfig();

            expect(fields).toBeDefined();
            expect(Object.keys(fields)).toContain("title");
        });

        it("excludes association foreign-key columns but keeps the association alias", async () => {
            const ctx = await buildContext();

            const fields = ctx.accessor(admin).getFieldsConfig();

            expect(Object.keys(fields)).toContain("project");
            expect(Object.keys(fields)).not.toContain("projectId");
        });

        it("ignores the removed boolean field-config shorthand and keeps the field with defaults", async () => {
            const ctx = await buildContext({taskConfig: {fields: {secret: false as any}}});

            const fields = ctx.accessor(admin).getFieldsConfig();

            expect(Object.keys(fields)).toContain("title");
            expect(Object.keys(fields)).toContain("secret");
            expect(fields.secret.config).toMatchObject({key: "secret", title: "secret"});
        });

        it("hides a field guarded by groupsAccessRights from users outside those groups", async () => {
            const taskConfig: ModelConfig = {
                fields: {title: {title: "Title", groupsAccessRights: ["managers"]}},
            };

            const managerCtx = await buildContext({taskConfig});
            const managerFields = managerCtx.accessor(member(7, [{id: 1, name: "managers"}])).getFieldsConfig();
            expect(Object.keys(managerFields)).toContain("title");

            const outsiderCtx = await buildContext({taskConfig});
            const outsiderFields = outsiderCtx.accessor(member(7, [{id: 2, name: "others"}])).getFieldsConfig();
            expect(Object.keys(outsiderFields)).not.toContain("title");
        });

        it("caches the computed fields for subsequent calls", async () => {
            const ctx = await buildContext();
            const accessor = ctx.accessor(admin);

            expect(accessor.getFieldsConfig()).toBe(accessor.getFieldsConfig());
        });

        it("returns an empty set when the model has no attributes", async () => {
            const ctx = await buildContext();

            expect(fakeAccessor(ctx, {attributes: undefined}, admin).getFieldsConfig()).toEqual({});
        });

        it("drops association fields when the user lacks read rights on the target model", async () => {
            const ctx = await buildContext({authEnabled: true});
            ctx.adminizer.accessRightsHelper.registerToken({
                id: "read-Task-model", name: "Read", description: "read", department: "test",
            });
            const user = member(7, [{id: 1, name: "g", tokens: ["read-task-model"]}]);

            const fields = ctx.accessor(user).getFieldsConfig();

            expect(Object.keys(fields)).toContain("title");
            for (const association of ["project", "owner", "team", "watchers", "teams"]) {
                expect(Object.keys(fields)).not.toContain(association);
            }
        });

        it("prefers action-specific field config over the global one", async () => {
            const ctx = await buildContext({
                taskConfig: {
                    fields: {title: {title: "Global"}},
                    list: {fields: {title: {title: "FromList"}}},
                },
            });

            expect(ctx.accessor(admin, "list").getFieldsConfig().title.config.title).toBe("FromList");
            expect(ctx.accessor(admin, "edit").getFieldsConfig().title.config.title).toBe("Global");
        });

        it("orders fields: action config first, then global config, then model order", async () => {
            const ctx = await buildContext({
                taskConfig: {
                    fields: {code: {title: "Code"}},
                    list: {fields: {secret: {title: "Secret"}}},
                },
            });

            const fields = ctx.accessor(admin, "list").getFieldsConfig();

            expect(Object.keys(fields).slice(0, 2)).toEqual(["secret", "code"]);
        });

        it("marks date model attributes as datetime by default", async () => {
            const ctx = await buildContext();

            expect(ctx.accessor(admin).getFieldsConfig().dueDate.config.type).toBe("datetime");
        });

        it("derives `required` from the model attribute", async () => {
            const ctx = await buildContext();

            const fields = ctx.accessor(admin).getFieldsConfig();

            expect(fields.code.config.required).toBe(true);
            expect(fields.title.config.required).toBe(false);
        });

        it("attaches populated fields config and the associated model config to associations", async () => {
            const ctx = await buildContext({projectConfig: {fields: {name: {title: "Project name"}}}});

            const fields = ctx.accessor(admin).getFieldsConfig();

            expect(fields.project.modelConfig).toBe(ctx.adminizer.config.models.Project);
            const populated = fields.project.populated as any;
            expect(populated.name.config.title).toBe("Project name");
        });

        it("uses the associated model's edit fields config for view and none for remove", async () => {
            const ctx = await buildContext({projectConfig: {edit: {fields: {name: {title: "EditName"}}}}});

            const viewFields = ctx.accessor(admin, "view").getFieldsConfig();
            expect((viewFields.project.populated as any).name.config.title).toBe("EditName");

            const removeFields = ctx.accessor(admin, "remove").getFieldsConfig();
            expect((removeFields.project.populated as any).name.config.title).toBe("name");
        });

        it("matches groupsAccessRights case-insensitively", async () => {
            const ctx = await buildContext({
                taskConfig: {fields: {title: {title: "Title", groupsAccessRights: ["managers"]}}},
            });

            const fields = ctx.accessor(member(7, [{id: 1, name: "MANAGERS"}])).getFieldsConfig();

            expect(Object.keys(fields)).toContain("title");
        });

        it("hides guarded fields from a user without a groups list", async () => {
            const ctx = await buildContext({
                taskConfig: {fields: {title: {title: "Title", groupsAccessRights: ["managers"]}}},
            });
            const groupless: Partial<User> = {id: 7, login: "u7", isAdministrator: false};

            const fields = ctx.accessor(groupless).getFieldsConfig();

            expect(Object.keys(fields)).not.toContain("title");
            expect(Object.keys(fields)).toContain("secret");
        });

        it("throws on an unknown action type", async () => {
            const ctx = await buildContext();

            let thrown: unknown;
            try {
                ctx.accessor(admin, "bogus" as ActionType).getFieldsConfig();
            } catch (e) {
                thrown = e;
            }

            expect(String(thrown)).toMatch(/Action type error: unknown type \[bogus\]/);
        });
    });

    describe("process", () => {
        it("keeps the primary key and scalar fields, drops fields hidden by groupsAccessRights", async () => {
            const ctx = await buildContext({
                taskConfig: {fields: {secret: {title: "Secret", groupsAccessRights: ["managers"]}}},
            });
            const task = await ctx.models.TaskModel.create({title: "t", secret: "s"});

            const record = ctx.accessor(member(7, [{id: 1, name: "staff"}]), "view").process(task.toJSON());

            expect(record.id).toBe(task.get("id"));
            expect(record.title).toBe("t");
            expect(record).not.toHaveProperty("secret");
        });

        it("passes association ids through and filters populated association objects", async () => {
            const ctx = await buildContext();
            const project = await ctx.models.ProjectModel.create({name: "p"});
            const task = await ctx.models.TaskModel.create({title: "t", projectId: project.get("id")});

            const plain = ctx.accessor(admin, "view").process({
                id: task.get("id"),
                title: "t",
                project: project.get("id"),
            });
            expect(plain.project).toBe(project.get("id"));

            const populated = ctx.accessor(admin, "view").process({
                id: task.get("id"),
                title: "t",
                project: project.toJSON(),
            });
            expect(populated.project).toMatchObject({id: project.get("id"), name: "p"});
        });

        it("returns only the primary key for a user in the default user group", async () => {
            const ctx = await buildContext({registration: {defaultUserGroup: "guests"}});
            const task = await ctx.models.TaskModel.create({title: "t"});

            const record = ctx.accessor(member(7, [{id: 1, name: "guests"}]), "view").process(task.toJSON());

            expect(record).toEqual({id: task.get("id")});
        });

        it("returns an empty record when the user has no access rights to the model", async () => {
            const ctx = await buildContext({authEnabled: true});
            const task = await ctx.models.TaskModel.create({title: "t", secret: "s"});

            const record = ctx.accessor(member(7), "view").process(task.toJSON());

            expect(record).toEqual({});
        });

        it("passes association-many id arrays through untouched", async () => {
            const ctx = await buildContext();

            const record = ctx.accessor(admin, "view").process({id: 1, watchers: [4, 5]});

            expect(record.watchers).toEqual([4, 5]);
        });

        it("omits association-many values that are not arrays", async () => {
            const ctx = await buildContext();

            const record = ctx.accessor(admin, "view").process({id: 1, watchers: "oops"});

            expect(record).not.toHaveProperty("watchers");
        });

        it("passes null association values through", async () => {
            const ctx = await buildContext();

            const record = ctx.accessor(admin, "view").process({id: 1, project: null});

            expect(record.project).toBeNull();
        });

        it("applies populate select given as an object map, keeping only enabled fields", async () => {
            const ctx = await buildContext();

            const record = ctx.accessor(admin, "view").process(
                {id: 1, project: {id: 9, name: "p", createdAt: "2026-01-01"}},
                {populate: {project: {select: {name: true, createdAt: false}}}},
            );

            expect(record.project).toEqual({name: "p"});
        });

        it("keeps selected fields without config access only for admins when auth is enabled", async () => {
            const ctx = await buildContext({
                authEnabled: true,
                projectConfig: {fields: {name: {title: "Name", groupsAccessRights: ["managers"]}}},
            });
            ctx.adminizer.accessRightsHelper.registerToken({
                id: "read-Task-model", name: "Read", description: "read", department: "test",
            });
            ctx.adminizer.accessRightsHelper.registerToken({
                id: "read-Project-model", name: "Read", description: "read", department: "test",
            });
            const user = member(7, [{id: 1, name: "staff", tokens: ["read-task-model", "read-project-model"]}]);
            const input = {id: 1, title: "t", project: {id: 9, name: "hidden"}};
            const criteria = {populate: {project: {select: ["id", "name"]}}};

            const record = ctx.accessor(user, "view").process(input, criteria);
            expect(record.project).toEqual({id: 9});

            const adminRecord = ctx.accessor(admin, "view").process(input, criteria);
            expect(adminRecord.project).toEqual({id: 9, name: "hidden"});
        });
    });

    describe("processMany", () => {
        it("maps process over every record", async () => {
            const ctx = await buildContext({
                taskConfig: {fields: {secret: {title: "Secret", groupsAccessRights: ["managers"]}}},
            });
            const t1 = await ctx.models.TaskModel.create({title: "a", secret: "s"});
            const t2 = await ctx.models.TaskModel.create({title: "b", secret: "s"});

            const records = ctx.accessor(member(7, [{id: 1, name: "staff"}]), "list")
                .processMany([t1.toJSON(), t2.toJSON()]);

            expect(records).toHaveLength(2);
            expect(records.map((r: any) => r.title)).toEqual(["a", "b"]);
            records.forEach((r) => expect(r).not.toHaveProperty("secret"));
        });
    });

    it("keeps explicitly selected fields for populated hasMany records", async () => {
        const orm = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: false,
        });
        sequelizeConnections.push(orm);

        const Session = orm.define("Session", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
        });
        const Message = orm.define("Message", {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            role: DataTypes.STRING,
            content: DataTypes.TEXT,
            tokens: DataTypes.INTEGER,
            session_id: DataTypes.UUID,
        });

        Session.hasMany(Message, {
            foreignKey: "session_id",
            as: "messages",
        });
        Message.belongsTo(Session, {
            foreignKey: "session_id",
            as: "session",
        });

        await orm.sync({force: true});

        const session = await Session.create({});
        const message = await Message.create({
            role: "assistant",
            content: "Stored content",
            tokens: 42,
            session_id: session.get("id"),
        });

        const adapter = new SequelizeAdapter(orm);
        const adminizer = new Adminizer([adapter]);
        adminizer.config = {
            routePrefix: "",
            auth: {enable: false},
            models: {
                Session: {},
                Message: {
                    fields: {
                        role: false,
                        content: false,
                        tokens: false,
                    },
                },
            },
        } as any;

        const sessionModel = new adapter.Model("Session", Session);
        adminizer.modelHandler.add("Session", sessionModel);
        adminizer.modelHandler.add("Message", new adapter.Model("Message", Message));

        const modelResource: ModelResource = {
            name: "Session",
            config: adminizer.config.models.Session,
            model: sessionModel,
            uri: "/model/session",
        };
        const dataAccessor = new DataAccessor(adminizer, {
            id: "1",
            login: "admin",
            isAdministrator: true,
            groups: [],
        } as any, modelResource, "view");

        const records = await sessionModel.find({
            populate: {
                messages: {
                    select: ["id", "role", "content", "tokens"],
                },
            },
        }, dataAccessor) as any[];

        expect(records[0].messages).toEqual([{
            id: message.get("id"),
            role: "assistant",
            content: "Stored content",
            tokens: 42,
        }]);
    });
});
