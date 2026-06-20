import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataTypes} from "sequelize";
import {Adminizer} from "../src/lib/Adminizer";
import {DataAccessor} from "../src/lib/DataAccessor";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {ModelResource} from "../src/interfaces/types";

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
