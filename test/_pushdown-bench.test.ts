import "reflect-metadata";
import {afterEach, describe, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {Adminizer} from "../src/lib/Adminizer";
import {DataAccessor} from "../src/lib/DataAccessor";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {buildInternalModelAccess} from "../src/system/buildInternalModelAccess";
import {ModelResource} from "../src/interfaces/types";
import {ActionType, AdminpanelConfig} from "../src/interfaces/adminpanelConfig";
import {User} from "../src/models/User";

const logger = vi.hoisted(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    verbose: vi.fn(), silly: vi.fn(), close: vi.fn(),
}));
vi.mock("winston", () => {
    const winston = {
        format: {combine: vi.fn(() => ({})), timestamp: vi.fn(() => ({})), printf: vi.fn(() => ({}))},
        transports: {Console: class Console {}, File: class File {}},
        createLogger: vi.fn(() => logger),
    };
    return {...winston, default: winston};
});

/**
 * Not a test — a measurement, kept so the numbers in the accessGraph docs can be reproduced.
 * Skipped by default: it seeds up to 1000 projects four times over and takes about a minute.
 * Run it with `npx vitest run test/_pushdown-bench.test.ts -t benchmark` after flipping
 * `describe.skip` to `describe`.
 */
describe.skip("pushdown benchmark", () => {
    const conns: Sequelize[] = [];
    afterEach(async () => { await Promise.all(conns.splice(0).map((o) => o.close())); });

    async function build(pushdown: boolean, rootField: boolean, queries: string[], scale: {projects: number, tasksPerProject: number, commentsPerTask: number}) {
        const orm = new Sequelize({
            dialect: "sqlite", storage: ":memory:",
            logging: (sql: string) => queries.push(sql),
        });
        conns.push(orm);
        const UserModel = orm.define("User", {login: DataTypes.STRING});
        const GroupModel = orm.define("Group", {name: DataTypes.STRING, tokens: DataTypes.JSON});
        const ProjectModel = orm.define("Project", {name: DataTypes.STRING});
        const ProjectMemberModel = orm.define("ProjectMember", {});
        const TaskModel = orm.define("Task", {title: DataTypes.STRING});
        const CommentModel = orm.define("Comment", {text: DataTypes.STRING, projectId: DataTypes.INTEGER});
        ProjectMemberModel.belongsTo(UserModel, {foreignKey: "userId", as: "user"});
        ProjectMemberModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        ProjectMemberModel.belongsTo(GroupModel, {foreignKey: "groupId", as: "group"});
        TaskModel.belongsTo(ProjectModel, {foreignKey: "projectId", as: "project"});
        CommentModel.belongsTo(TaskModel, {foreignKey: "taskId", as: "task"});
        await orm.sync({force: true});
        await UserModel.create({id: 7, login: "u7"});

        const projects: any[] = [];
        for (let p = 0; p < scale.projects; p++) {
            const project = await ProjectModel.create({name: `p${p}`});
            projects.push(project);
            if (p % 2 === 0) {
                await ProjectMemberModel.create({userId: 7, projectId: project.get("id")});
            }
        }
        const taskRows: any[] = [];
        for (const project of projects) {
            for (let t = 0; t < scale.tasksPerProject; t++) {
                taskRows.push({title: "t", projectId: project.get("id")});
            }
        }
        const tasks = await TaskModel.bulkCreate(taskRows);
        const commentRows: any[] = [];
        for (const task of tasks) {
            for (let c = 0; c < scale.commentsPerTask; c++) {
                commentRows.push({text: "c", taskId: task.get("id"), projectId: task.get("projectId")});
            }
        }
        await CommentModel.bulkCreate(commentRows);

        const adapter = new SequelizeAdapter(orm);
        const adminizer = new Adminizer([adapter]);
        const graph: AdminpanelConfig["accessGraph"] = {
            project: {
                root: "Project",
                membership: {through: "ProjectMember", via: "user"},
                include: {Task: {parent: "project"}, Comment: {parent: "task"}},
                ...(rootField ? {graphRootField: {Comment: "projectId"}} : {}),
                pushdown,
            },
        };
        adminizer.config = {
            routePrefix: "", auth: {enable: false},
            models: {User: {}, Group: {}, Project: {}, ProjectMember: {}, Task: {}, Comment: {}},
            accessGraph: graph,
        } as any;
        const ormModels: Record<string, any> = {User: UserModel, Group: GroupModel, Project: ProjectModel, ProjectMember: ProjectMemberModel, Task: TaskModel, Comment: CommentModel};
        for (const [name, model] of Object.entries(ormModels)) {
            adminizer.modelHandler.add(name, new adapter.Model(name, model));
        }
        adminizer.modelHandler.configureInternalAccess(buildInternalModelAccess(adminizer.config, adminizer.modelHandler));
        const accessor = (modelName: string, action: ActionType = "list") => {
            const modelResource: ModelResource = {
                name: modelName, config: adminizer.config.models[modelName],
                model: adminizer.modelHandler.getResource(modelName), uri: `/model/${modelName.toLowerCase()}`,
            };
            return new DataAccessor(adminizer, {id: 7, login: "u7", isAdministrator: false, groups: []} as unknown as User, modelResource, action);
        };
        return {orm, adminizer, accessor, models: ormModels};
    }

    const scales = [
        {projects: 200, tasksPerProject: 50, commentsPerTask: 1},
        {projects: 1000, tasksPerProject: 50, commentsPerTask: 1},
    ];
    const variants = [
        {pushdown: false, rootField: false, name: "materialized (chain walk)"},
        {pushdown: false, rootField: true, name: "materialized + graphRootField"},
        {pushdown: true, rootField: false, name: "pushdown"},
        {pushdown: true, rootField: true, name: "pushdown + graphRootField"},
    ];

    it("compares pushdown vs materialization on a paginated list", async () => {
        const out: any[] = [];
        for (const scale of scales) {
            for (const variant of variants) {
                const pushdown = variant.pushdown;
                const queries: string[] = [];
                const ctx = await build(variant.pushdown, variant.rootField, queries, scale);
                const commentModel = ctx.adminizer.modelHandler.getResource("Comment");

                await commentModel.find({limit: 25}, ctx.accessor("Comment"));

                queries.length = 0;
                const iterations = 20;
                const t0 = performance.now();
                let rows = 0;
                for (let i = 0; i < iterations; i++) {
                    const records = await commentModel.find({limit: 25}, ctx.accessor("Comment")) as any[];
                    rows = records.length;
                }
                const ms = (performance.now() - t0) / iterations;

                const filterQueries = queries.length / iterations;
                const maxSql = Math.max(...queries.map((q) => q.length));

                const s0 = performance.now();
                for (let i = 0; i < iterations; i++) {
                    await ctx.accessor("Comment").sanitizeUserRelationAccess();
                }
                const sanitizeMs = (performance.now() - s0) / iterations;

                out.push({
                    scale: `${scale.projects}proj/${scale.tasksPerProject}task`,
                    variant: variant.name,
                    pageRows: rows,
                    queriesPerRequest: filterQueries,
                    maxSqlBytes: maxSql,
                    msPerPage: Number(ms.toFixed(2)),
                    msBuildingFilterOnly: Number(sanitizeMs.toFixed(2)),
                });
            }
        }
        console.log("\n" + JSON.stringify(out, null, 1));
    }, 900000);
});
