import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {Adminizer} from "../src/lib/Adminizer";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {AbstractHistoryAdapter} from "../src/lib/history-actions/AbstractHistoryAdapter";
import {buildInternalModelAccess} from "../src/system/buildInternalModelAccess";
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
        transports: {Console: class Console {}, File: class File {}},
        createLogger: vi.fn(() => logger),
    };

    return {...winston, default: winston};
});

/**
 * Query-count and cascade semantics of the Sequelize adapter. These are the invariants
 * that keep reads O(1) in the number of rows and stop the application-level cascade from
 * deleting records it does not own.
 */
describe("sequelize adapter query efficiency", () => {
    const connections: Sequelize[] = [];

    afterEach(async () => {
        await Promise.all(connections.splice(0).map((orm) => orm.close()));
    });

    /** Project 1—* Task 1—* Comment, plus Post *—* Tag through PostTag. */
    async function build(queries: string[], rows = 5) {
        const orm = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: (sql: string) => queries.push(sql),
        });
        connections.push(orm);

        const Project = orm.define("Project", {name: DataTypes.STRING});
        const Task = orm.define("Task", {title: DataTypes.STRING});
        const Comment = orm.define("Comment", {text: DataTypes.STRING});
        const Post = orm.define("Post", {title: DataTypes.STRING});
        const Tag = orm.define("Tag", {name: DataTypes.STRING});
        const PostTag = orm.define("PostTag", {});

        Task.belongsTo(Project, {foreignKey: "projectId", as: "project"});
        Project.hasMany(Task, {foreignKey: "projectId", as: "tasks"});
        Comment.belongsTo(Task, {foreignKey: "taskId", as: "task"});
        Task.hasMany(Comment, {foreignKey: "taskId", as: "comments"});
        Post.belongsToMany(Tag, {through: PostTag, as: "tags", foreignKey: "postId", otherKey: "tagId"});
        Tag.belongsToMany(Post, {through: PostTag, as: "posts", foreignKey: "tagId", otherKey: "postId"});

        await orm.sync({force: true});

        const project = await Project.create({name: "p"});
        for (let i = 0; i < rows; i++) {
            const task = await Task.create({title: `t${i}`, projectId: project.get("id")});
            await Comment.create({text: `c${i}`, taskId: task.get("id")});
        }

        const adapter = new SequelizeAdapter(orm);
        return {
            orm,
            adapter,
            ormModels: {Project, Task, Comment, Post, Tag, PostTag},
            TaskModel: new adapter.Model("Task", Task) as any,
            PostModel: new adapter.Model("Post", Post) as any,
        };
    }

    describe("reads", () => {
        it("keeps the query count independent of the number of rows", async () => {
            const queries: string[] = [];
            const ctx = await build(queries, 5);

            queries.length = 0;
            const fiveRows = await ctx.TaskModel._find({});
            const queriesForFive = queries.length;

            queries.length = 0;
            await ctx.TaskModel._find({});
            const queriesAgain = queries.length;

            expect(fiveRows).toHaveLength(5);
            // One statement for the whole page — the associations ride along in the JOIN
            expect(queriesForFive).toBe(1);
            expect(queriesAgain).toBe(queriesForFive);
        });

        it("still returns populated associations, exactly like findOne does", async () => {
            const queries: string[] = [];
            const ctx = await build(queries, 3);

            const [fromFind] = await ctx.TaskModel._find({where: {id: 1}});
            const fromFindOne = await ctx.TaskModel._findOne({where: {id: 1}});

            expect(fromFind.project).toMatchObject({name: "p"});
            expect(fromFind.comments).toHaveLength(1);
            expect(fromFind).toEqual(fromFindOne);
        });
    });

    describe("cascade on delete", () => {
        it("deletes the children of a record but never its parent", async () => {
            const queries: string[] = [];
            const ctx = await build(queries, 3);

            await ctx.TaskModel._destroyOne({where: {id: 1}});

            expect(await ctx.ormModels.Project.count(), "parent project").toBe(1);
            expect(await ctx.ormModels.Task.count(), "sibling tasks").toBe(2);
            expect(await ctx.ormModels.Comment.count(), "own comment removed").toBe(2);
        });

        it("deletes children in bulk for a multi-record destroy", async () => {
            const queries: string[] = [];
            const ctx = await build(queries, 5);

            queries.length = 0;
            await ctx.TaskModel._destroy({where: {}});

            expect(await ctx.ormModels.Comment.count()).toBe(0);
            expect(await ctx.ormModels.Project.count(), "parent project").toBe(1);
            // Bulk: one DELETE for the children, not one per row
            expect(queries.filter((sql) => /DELETE FROM `Comments`/.test(sql))).toHaveLength(1);
        });

        it("unlinks many-to-many rows instead of deleting the shared far side", async () => {
            const queries: string[] = [];
            const ctx = await build(queries, 1);
            const {Post, Tag, PostTag} = ctx.ormModels;

            const first = await Post.create({title: "first"});
            const second = await Post.create({title: "second"});
            const shared = await Tag.create({name: "shared"});
            await (first as any).addTag(shared);
            await (second as any).addTag(shared);

            await ctx.PostModel._destroyOne({where: {id: first.get("id")}});

            // The tag belongs to the other post as well — it must survive
            expect(await Tag.count(), "shared tag").toBe(1);
            expect(await PostTag.count(), "only the link of the deleted post is gone").toBe(1);
            expect(await Post.count()).toBe(1);
        });
    });

    describe("history lookups", () => {
        class TestHistoryAdapter extends AbstractHistoryAdapter {
            public id = "test";
            public constructor(adminizer: Adminizer) {
                super(adminizer);
            }
            public async getAllModelHistory(): Promise<HistoryActions[]> { return []; }
            public async getAllHistory(): Promise<{data: HistoryActions[]}> { return {data: []}; }
            public async setHistory(): Promise<void> { /* not used */ }
            public async getModelFieldsHistory(): Promise<Record<string, any>> { return {}; }
            public displayNames(history: HistoryActions[]) {
                return this.setModelsDisplayName(history);
            }
            public relationIds(model: string, ids: number[]) {
                return this.getModelRelationsHistory(model, ids);
            }
        }

        async function historyContext(queries: string[]) {
            const ctx = await build(queries, 5);
            const adminizer = new Adminizer([ctx.adapter]);
            adminizer.config = {
                routePrefix: "",
                auth: {enable: false},
                history: {enabled: true},
                models: {Project: {}, Task: {displayName: "title"}, Comment: {}},
            } as any;
            adminizer.modelHandler.add("Project", new ctx.adapter.Model("Project", ctx.ormModels.Project));
            adminizer.modelHandler.add("Task", new ctx.adapter.Model("Task", ctx.ormModels.Task));
            adminizer.modelHandler.add("Comment", new ctx.adapter.Model("Comment", ctx.ormModels.Comment));
            adminizer.modelHandler.configureInternalAccess(
                buildInternalModelAccess(adminizer.config, adminizer.modelHandler)
            );
            return {ctx, adapter: new TestHistoryAdapter(adminizer)};
        }

        const historyRow = (modelId: number): HistoryActions =>
            ({modelName: "Task", modelId: String(modelId), user: {id: 1} as User} as unknown as HistoryActions);

        it("resolves display names with one query per model, not per row", async () => {
            const queries: string[] = [];
            const {adapter} = await historyContext(queries);

            queries.length = 0;
            const named = await adapter.displayNames([1, 2, 3, 4, 5].map(historyRow));

            expect(named.map((row) => row.displayName)).toEqual(["t0", "t1", "t2", "t3", "t4"]);
            expect(queries.filter((sql) => /FROM `Tasks`/.test(sql))).toHaveLength(1);
        });

        it("falls back to the id when the referenced record is gone", async () => {
            const queries: string[] = [];
            const {adapter} = await historyContext(queries);

            const named = await adapter.displayNames([historyRow(1), historyRow(999)]);

            expect(named[0].displayName).toBe("t0");
            expect(named[1].displayName).toBe("999");
        });

        it("checks the existence of related ids with a single query", async () => {
            const queries: string[] = [];
            const {adapter} = await historyContext(queries);

            queries.length = 0;
            const existing = await adapter.relationIds("Task", [1, 2, 999]);

            expect(existing).toEqual([1, 2]);
            expect(queries.filter((sql) => /FROM `Tasks`/.test(sql))).toHaveLength(1);
        });
    });
});
