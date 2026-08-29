import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {DataSource, EntitySchema} from "typeorm";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {TypeOrmAdapter} from "../src/lib/model/adapter/typeorm";
import {AbstractModel} from "../src/lib/model/AbstractModel";
import {QueryCriteria} from "../src/interfaces/queryCriteria";

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
 * Record scoping emits the same criteria to every adapter, so the adapters must agree on
 * what those criteria mean. The dangerous direction is silent widening: an operand the
 * adapter does not understand has to match nothing (or throw), never everything.
 */
describe("adapter parity for record-access criteria", () => {
    const teardown: Array<() => Promise<unknown>> = [];

    afterEach(async () => {
        await Promise.all(teardown.splice(0).map((close) => close()));
        logger.warn.mockClear();
    });

    /** Same two rows, same access, one model wrapper per adapter. */
    async function buildModels(): Promise<Record<string, AbstractModel<any>>> {
        const orm = new Sequelize({dialect: "sqlite", storage: ":memory:", logging: false});
        teardown.push(() => orm.close());
        const SequelizeTask = orm.define("Task", {title: DataTypes.STRING, ownerId: DataTypes.INTEGER});
        const SequelizeNote = orm.define("Note", {text: DataTypes.STRING});
        SequelizeNote.belongsTo(SequelizeTask, {foreignKey: "taskId", as: "task"});
        await orm.sync({force: true});
        await SequelizeTask.bulkCreate([
            {id: 1, title: "mine", ownerId: 7},
            {id: 2, title: "foreign", ownerId: 8},
        ]);
        await SequelizeNote.bulkCreate([
            {id: 1, text: "n1", taskId: 1},
            {id: 2, text: "n2", taskId: 2},
            {id: 3, text: "orphan", taskId: null},
        ]);

        const TaskEntity = new EntitySchema({
            name: "Task",
            tableName: "Tasks",
            columns: {
                id: {type: Number, primary: true},
                title: {type: String, nullable: true},
                ownerId: {type: Number, nullable: true},
            },
        });
        // The FK is declared as a real column property — the shape `populateOn` needs.
        const NoteEntity = new EntitySchema({
            name: "Note",
            tableName: "Notes",
            columns: {
                id: {type: Number, primary: true},
                text: {type: String, nullable: true},
                taskId: {type: Number, nullable: true},
            },
            relations: {
                task: {
                    type: "many-to-one",
                    target: "Task",
                    joinColumn: {name: "taskId"},
                    nullable: true,
                },
            },
        });
        const dataSource = new DataSource({
            type: "sqlite",
            database: ":memory:",
            entities: [TaskEntity, NoteEntity],
            synchronize: true,
            logging: false,
        });
        teardown.push(() => dataSource.destroy());
        await dataSource.initialize();
        await dataSource.getRepository("Task").save([
            {id: 1, title: "mine", ownerId: 7},
            {id: 2, title: "foreign", ownerId: 8},
        ]);
        await dataSource.getRepository("Note").save([
            {id: 1, text: "n1", taskId: 1},
            {id: 2, text: "n2", taskId: 2},
            {id: 3, text: "orphan", taskId: null},
        ]);

        const sequelizeAdapter = new SequelizeAdapter(orm);
        const typeOrmAdapter = new TypeOrmAdapter(dataSource);

        return {
            sequelize: new sequelizeAdapter.Model("Task", SequelizeTask),
            typeorm: new typeOrmAdapter.Model("Task", dataSource.getMetadata("Task")),
        };
    }

    /** Same rows again, but the Note model wrappers — for `populateOn` semantics. */
    async function buildNoteModels(): Promise<Record<string, AbstractModel<any>>> {
        const models = await buildModels();
        const sequelizeModel = (models.sequelize as any);
        const typeormModel = (models.typeorm as any);
        const orm: Sequelize = sequelizeModel.model.sequelize;
        const dataSource: DataSource = typeormModel.metadata.connection;
        const sequelizeAdapter = new SequelizeAdapter(orm);
        const typeOrmAdapter = new TypeOrmAdapter(dataSource);
        return {
            sequelize: new sequelizeAdapter.Model("Note", orm.models.Note),
            typeorm: new typeOrmAdapter.Model("Note", dataSource.getMetadata("Note")),
        };
    }

    /** Bypasses DataAccessor: these are adapter-level criteria semantics. */
    const rawFind = (model: AbstractModel<any>, criteria: QueryCriteria) =>
        (model as any)._find(criteria) as Promise<any[]>;

    it("treats a populated IN list identically", async () => {
        const models = await buildModels();

        for (const [name, model] of Object.entries(models)) {
            const rows = await rawFind(model, {where: {ownerId: {in: [7]}}});
            expect(rows.map((row) => row.id), name).toEqual([1]);
        }
    });

    it("matches nothing for an empty IN list", async () => {
        const models = await buildModels();

        for (const [name, model] of Object.entries(models)) {
            const rows = await rawFind(model, {where: {ownerId: {in: []}}});
            expect(rows, name).toHaveLength(0);
        }
    });

    it("fails closed for an absent IN operand instead of widening the query", async () => {
        const models = await buildModels();

        for (const [name, model] of Object.entries(models)) {
            expect(await rawFind(model, {where: {ownerId: {in: undefined}}}), `${name} (undefined)`).toHaveLength(0);
            expect(await rawFind(model, {where: {ownerId: {in: null}}}), `${name} (null)`).toHaveLength(0);
        }
    });

    it("declares populateOn support for a belongsTo with a real FK column", async () => {
        const models = await buildNoteModels();

        for (const [name, model] of Object.entries(models)) {
            expect(model.canPushdownPopulateAccess?.("task"), name).toBe(true);
        }
    });

    it("confines a populate JOIN by populateOn and collapses filtered records to bare FKs", async () => {
        const models = await buildNoteModels();

        for (const [name, model] of Object.entries(models)) {
            const rows = await rawFind(model, {sort: "id ASC", populateOn: {task: {ownerId: {in: [7]}}}});
            expect(rows.map((row) => row.task), name).toEqual([
                expect.objectContaining({id: 1, title: "mine"}),
                2,
                null,
            ]);
        }
    });

    it("collapses every association for a never-matching populateOn", async () => {
        const models = await buildNoteModels();

        for (const [name, model] of Object.entries(models)) {
            const rows = await rawFind(model, {sort: "id ASC", populateOn: {task: {ownerId: {in: []}}}});
            expect(rows.map((row) => row.task), name).toEqual([1, 2, null]);
        }
    });

    it("keeps populateOn out of the owning rows' WHERE", async () => {
        const models = await buildNoteModels();

        for (const [name, model] of Object.entries(models)) {
            const rows = await rawFind(model, {sort: "id ASC", populateOn: {task: {ownerId: {in: []}}}});
            // LEFT JOIN semantics: filtering the association never drops the owner.
            expect(rows, name).toHaveLength(3);
        }
    });

    it("refuses the unsupported intersects operator on both adapters", async () => {
        const models = await buildModels();

        for (const [name, model] of Object.entries(models)) {
            await expect(
                rawFind(model, {where: {ownerId: {intersects: [7]}}}),
                name
            ).rejects.toThrow(/intersects/);
        }
    });
});
