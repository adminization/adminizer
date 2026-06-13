import "reflect-metadata";
import {afterEach, describe, expect, it} from "vitest";
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
