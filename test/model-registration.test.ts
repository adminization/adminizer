import "reflect-metadata";
import {afterEach, describe, expect, it, vi} from "vitest";
import {Sequelize} from "sequelize-typescript";
import {DataSource} from "typeorm";
import {Adminizer} from "../src/lib/Adminizer";
import {AbstractAdminizerApp, AppSetupContext} from "../src/lib/app-manager/AdminizerApp";
import {SequelizeAdapter} from "../src/lib/model/adapter/sequelize";
import {TypeOrmAdapter} from "../src/lib/model/adapter/typeorm";
import {
    SYSTEM_MODEL_CONTRACTS,
    validateSystemModelContract,
} from "../src/system/systemModelContracts";
import {registerSequelizeSystemModels} from "../fixture/models/sequelize/systemModels";
import {typeOrmSystemModels} from "../fixture/models/typeorm/systemModels";
import {
    installNavigationSequelizeModel,
    navigationModelName,
} from "../fixture/apps/navigation/NavigationModel";
import {MediaManagerApp} from "../fixture/apps/media-manager/MediaManagerApp";
import {
    installMediaManagerSequelizeModels,
    mediaManagerModelNames,
} from "../fixture/apps/media-manager/MediaManagerModels";
import {AbstractMediaManager} from "../src/lib/media-manager/AbstractMediaManager";

describe("model registration ownership", () => {
    const sequelizeConnections: Sequelize[] = [];
    const typeOrmConnections: DataSource[] = [];

    afterEach(async () => {
        await Promise.all(sequelizeConnections.splice(0).map((orm) => orm.close()));
        await Promise.all(
            typeOrmConnections.splice(0)
                .filter((dataSource) => dataSource.isInitialized)
                .map((dataSource) => dataSource.destroy())
        );
    });

    it("validates fixture-provided Sequelize system models", () => {
        const orm = createSequelize();
        registerSequelizeSystemModels(orm);
        const adapter = new SequelizeAdapter(orm);

        for (const contract of SYSTEM_MODEL_CONTRACTS) {
            const registeredModel = adapter.getModel(contract.name);
            expect(registeredModel).toBeDefined();
            validateSystemModelContract(
                new adapter.Model(contract.name, registeredModel),
                contract
            );
        }
    });

    it("validates fixture-provided TypeORM system models", async () => {
        const dataSource = new DataSource({
            type: "sqlite",
            database: ":memory:",
            entities: typeOrmSystemModels,
            synchronize: false,
            logging: false,
        });
        typeOrmConnections.push(dataSource);
        await dataSource.initialize();
        const adapter = new TypeOrmAdapter(dataSource);

        for (const contract of SYSTEM_MODEL_CONTRACTS) {
            const registeredModel = adapter.getModel(contract.name);
            expect(registeredModel).toBeDefined();
            validateSystemModelContract(
                new adapter.Model(contract.name, registeredModel),
                contract
            );
        }
    });

    it("enables an app after its Sequelize model is installed dynamically", async () => {
        const orm = createSequelize();
        await orm.sync();
        await installNavigationSequelizeModel(orm, navigationModelName, true);

        const adminizer = createAdminizer(new SequelizeAdapter(orm), "sequelize");
        await adminizer.appManager.enable(new ModelOnlyApp(navigationModelName, "sequelize"));

        expect(adminizer.modelHandler.model.has(navigationModelName)).toBe(true);

        await adminizer.appManager.disable("model-only");

        expect(adminizer.modelHandler.model.has(navigationModelName)).toBe(false);
        expect(orm.models[navigationModelName]).toBeDefined();
    });

    it("explains that missing TypeORM app entities must be registered before initialize", async () => {
        const dataSource = new DataSource({
            type: "sqlite",
            database: ":memory:",
            entities: [],
            synchronize: false,
            logging: false,
        });
        typeOrmConnections.push(dataSource);
        await dataSource.initialize();

        const adminizer = createAdminizer(new TypeOrmAdapter(dataSource), "typeorm");

        await expect(
            adminizer.appManager.enable(new ModelOnlyApp("MissingEntity", "typeorm"))
        ).rejects.toThrow(
            'TypeORM entities must be registered in DataSource before initialize()'
        );
    });

    it("registers and disposes the fixture media manager as an app", async () => {
        const orm = createSequelize();
        await orm.sync();
        await installMediaManagerSequelizeModels(orm, true);

        const adminizer = createAdminizer(new SequelizeAdapter(orm), "sequelize");
        await adminizer.appManager.enable(new MediaManagerApp({
            fileStoragePath: ".tmp/test-media",
        }));

        expect(adminizer.mediaManagerHandler.getByApp("media-manager")).toHaveLength(1);
        expect(adminizer.modelHandler.model.has(mediaManagerModelNames.media)).toBe(true);
        expect(adminizer.controllerHandler.getByApp("media-manager")).toHaveLength(0);

        const mediaItem = await orm.models[mediaManagerModelNames.media].create({
            parent: null,
            mimeType: "image/png",
            path: ".tmp/test-media/media-manager/test.png",
            size: 10,
            group: "test",
            tag: "origin",
            url: "/media-manager/test.png",
            filename: "test",
        });
        const manager = adminizer.mediaManagerHandler.get("default");
        await manager.setRelations([{id: String(mediaItem.get("id"))}], "Example", 1, "image");
        const relations = await manager.getRelations("Example", "image", 1);
        expect(relations).toMatchObject([{
            id: mediaItem.get("id"),
            mimeType: "image/png",
            filename: "test",
        }]);

        const variant = await orm.models[mediaManagerModelNames.media].create({
            parentId: mediaItem.get("id"),
            mimeType: "image/png",
            path: ".tmp/test-media/media-manager/test_sm.png",
            size: 5,
            group: "test",
            tag: "size:sm",
            url: "/media-manager/test_sm.png",
            filename: "test",
        });
        await orm.models[mediaManagerModelNames.meta].create({
            key: "imageSizes",
            value: {width: 100, height: 100},
            isPublic: false,
            parentId: variant.get("id"),
        });
        const variants = await manager.getVariants({
            id: String(mediaItem.get("id")),
            parent: null,
            mimeType: "image/png",
            path: ".tmp/test-media/media-manager/test.png",
            size: 10,
            group: "test",
            tag: "origin",
            url: "/media-manager/test.png",
            filename: "test",
        });
        expect(variants[0].meta).toMatchObject([{
            key: "imageSizes",
            value: {width: 100, height: 100},
        }]);

        await adminizer.appManager.disable("media-manager");

        expect(adminizer.mediaManagerHandler.getByApp("media-manager")).toHaveLength(0);
        expect(adminizer.modelHandler.model.has(mediaManagerModelNames.media)).toBe(false);
        expect(adminizer.controllerHandler.getByApp("media-manager")).toHaveLength(0);
    });

    it("keeps legacy media manager registration available", async () => {
        vi.useFakeTimers();
        try {
            const registerToken = vi.fn();
            const manager = new LegacyMediaManager({
                accessRightsHelper: {registerToken},
            } as Adminizer);
            const adminizer = createAdminizer(new SequelizeAdapter(createSequelize()), "sequelize");

            adminizer.mediaManagerHandler.add(manager);
            await vi.advanceTimersByTimeAsync(100);

            expect(adminizer.mediaManagerHandler.get("legacy")).toBe(manager);
            expect(registerToken).toHaveBeenCalledWith({
                id: "mediaManager-legacy",
                name: "legacy",
                description: "Access to edit media-manager for legacy",
                department: "media-manager",
            });
        } finally {
            vi.useRealTimers();
        }
    });

    function createSequelize(): Sequelize {
        const orm = new Sequelize({
            dialect: "sqlite",
            storage: ":memory:",
            logging: false,
        });
        sequelizeConnections.push(orm);
        return orm;
    }
});

class LegacyMediaManager extends AbstractMediaManager {
    readonly id = "legacy";

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    async getAll() {
        return {data: [], next: false};
    }

    async setRelations(): Promise<void> {}

    async getRelations() {
        return [];
    }

    async searchAll() {
        return [];
    }
}

class ModelOnlyApp extends AbstractAdminizerApp {
    readonly name = "model-only";
    readonly version = "1.0.0";

    constructor(
        private readonly modelName: string,
        private readonly adapter: string
    ) {
        super();
    }

    setup(ctx: AppSetupContext): void {
        ctx.model({
            name: this.modelName,
            adapter: this.adapter,
        });
    }
}

function createAdminizer(
    adapter: SequelizeAdapter | TypeOrmAdapter,
    defaultORM: string
): Adminizer {
    const adminizer = new Adminizer([adapter]);
    adminizer.config = {
        routePrefix: "",
        models: {},
        system: {
            defaultORM,
        },
    } as any;
    return adminizer;
}
