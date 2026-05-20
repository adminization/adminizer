import { describe, expect, it } from "vitest";
import { DataTypes, Op, Sequelize } from "sequelize";
import * as publicApi from "../src/index";
import {
    mapSequelizeToAdminizerAttributes,
    SequelizeModel,
} from "../src/lib/model/adapter/sequelize";
import { DataAccessor } from "../src/lib/DataAccessor";

describe("Adminizer core ORM contract", () => {
    function createModels() {
        const sequelize = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: false,
        });

        const User = sequelize.define("User", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            login: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
        });

        const Post = sequelize.define("Post", {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            views: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            published: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        });

        Post.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
        User.hasMany(Post, { as: "posts", foreignKey: "ownerId" });

        return { Post };
    }

    it("does not expose Waterline from the public API", () => {
        expect(publicApi).not.toHaveProperty("WaterlineAdapter");
        expect(publicApi).not.toHaveProperty("WaterlineModel");
    });

    it("maps Sequelize metadata to Adminizer attributes", () => {
        const { Post } = createModels();
        const attributes = mapSequelizeToAdminizerAttributes(Post as any);

        expect(attributes.id.type).toBe("number");
        expect(attributes.title).toMatchObject({
            type: "string",
            required: true,
            allowNull: false,
        });
        expect(attributes.views).toMatchObject({
            type: "number",
            required: false,
            allowNull: true,
        });
        expect(attributes.published.type).toBe("boolean");
        expect(attributes.ownerId.primaryKeyForAssociation).toBe(true);
        expect(attributes.owner).toMatchObject({
            type: "association",
            model: "User",
            via: "ownerId",
        });
    });

    it("converts adapter-neutral criteria to Sequelize options", () => {
        const { Post } = createModels();
        const model = new SequelizeModel("Post", Post as any);

        const options = (model as any)._convertAdminizerCriteriaToSequelizeOptions({
            where: {
                owner: 7,
                title: { contains: "hello" },
                views: { ">=": 10 },
                published: true,
            },
            skip: 20,
            limit: 10,
            sort: "views DESC",
        });

        expect(options.offset).toBe(20);
        expect(options.limit).toBe(10);
        expect(options.order).toEqual([["views", "DESC"]]);
        expect(options.where.ownerId).toBe(7);
        expect(options.where.title[Op.like]).toBe("%hello%");
        expect(options.where.views[Op.gte]).toBe(10);
        expect(options.where.published).toBe(true);
    });

    it("preserves Sequelize literal filters while sanitizing access criteria", async () => {
        const literal = Sequelize.literal("1=1");
        const accessor = Object.create(DataAccessor.prototype) as DataAccessor;

        Object.assign(accessor, {
            user: { isAdministrator: true },
            entity: {
                model: { modelname: "Example" },
                config: {},
            },
        });

        const sanitized = await accessor.sanitizeUserRelationAccess({
            where: literal as any,
        });

        expect(sanitized.where).toBe(literal);
    });

    it("combines Sequelize literal filters with user relation access", async () => {
        const literal = Sequelize.literal("1=1");
        const accessor = Object.create(DataAccessor.prototype) as DataAccessor;

        Object.assign(accessor, {
            user: {
                id: 5,
                login: "editor",
                isAdministrator: false,
            },
            entity: {
                model: {
                    modelname: "Example",
                    attributes: {
                        owner: { model: "UserAP" },
                    },
                },
                config: {
                    userAccessRelation: "owner",
                },
            },
        });

        const sanitized = await accessor.sanitizeUserRelationAccess({
            where: literal as any,
        });

        expect((sanitized.where as any).and).toEqual([
            literal,
            { owner: 5 },
        ]);
    });

    it("matches JSON array values with jsonContains on SQLite", async () => {
        const sequelize = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: false,
        });

        const Example = sequelize.define("Example", {
            selectMany: DataTypes.JSON,
        });
        Example.belongsTo(Example, { as: "parent", foreignKey: "parentId" });

        await sequelize.sync();
        await Example.bulkCreate([
            { selectMany: ["Sone", "Stwo"] },
            { selectMany: ["Sthree"] },
        ]);

        const model = new SequelizeModel("Example", Example as any);
        const count = await (model as any)._count({
            where: {
                or: [
                    { selectMany: { jsonContains: "Sone" } },
                    { selectMany: { jsonContains: "Stwo" } },
                ],
            },
        });

        expect(count).toBe(1);
    });
});
