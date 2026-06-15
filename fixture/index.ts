// Load environment variables from .env file
import dotenv from 'dotenv';

dotenv.config();
import "reflect-metadata";

import {Adminizer} from "../dist";
import http from 'http';
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";
import {sendNotificationsWithDelay} from "./helpers/notifications";
// OpenAiDataAgentService is imported dynamically only when AI assistant is enabled
import cors from 'cors';

// Sequelize imports
import {Sequelize} from "sequelize-typescript";
import fs from 'fs/promises';
import path from 'path';
import {Example as ExampleSequelize} from "./models/sequelize/Example";
import {JsonSchema as JsonSchemaSequelize} from "./models/sequelize/JsonSchema";
import {Test as TestSequelize} from "./models/sequelize/Test";
import {Category as CategorySequelize} from "./models/sequelize/Category";
import {TestCatalog as TestCatalogSequelize} from "./models/sequelize/TestCatalog";
import {registerSequelizeSystemModels} from "./models/sequelize/systemModels";
import {SequelizeAdapter} from "../dist/lib/model/adapter/sequelize";
import {DataSource} from "typeorm";
import {TypeOrmAdapter} from "../dist/lib/model/adapter/typeorm";
import {seedDatabase, seedTypeOrmDatabase} from "./helpers/seedDatabase";
import {ExampleTypeOrm} from "./models/typeorm/Example";
import {JsonSchemaTypeOrm} from "./models/typeorm/JsonSchema";
import {TestTypeOrm} from "./models/typeorm/Test";
import {CategoryTypeOrm} from "./models/typeorm/Category";
import {TestCatalogTypeOrm} from "./models/typeorm/TestCatalog";
import {typeOrmSystemModels} from "./models/typeorm/systemModels";


//Widgets imports
import {SwitcherOne, SwitcherTwo} from "./widgets/Switchers";
import {SiteLinks} from "./widgets/Links";
import {InfoOne, Info4, Info3, InfoTwo} from "./widgets/Info";
import {CustomOne} from "./widgets/Custom";
import {ActionOne, ActionTwo} from "./widgets/Actions";
import {TestCatalog} from "./virtual-catalog/virtualCatalog";
import {
    ExampleDatatablePriceRangeFilterHandler,
    ExampleJsonCustomFilterHandler,
    TypeOrmExampleDatatablePriceRangeFilterHandler,
    TypeOrmExampleJsonCustomFilterHandler
} from "./filters/customFilterHandlers";
import express from "express";
import cookieParser from "cookie-parser";
import {corsApi} from "./cors-api/api";
import {renderIndexPage, NavTreeNode} from "./pages/indexPage";
import {FileFeedbackHandler} from "./feedback/FileFeedbackHandler";
import {ComponentBApp} from "./apps/component-b/ComponentBApp";
import {ModuleManagerApp} from "./apps/module-manager/ModuleManagerApp";
import {NavigationApp} from "./apps/navigation/NavigationApp";
import {navigationAppConfig} from "./apps/navigation/navigationConfig";
import {installNavigationSequelizeModel, navigationModelName} from "./apps/navigation/NavigationModel";
import {MediaManagerApp} from "./apps/media-manager/MediaManagerApp";
import {installMediaManagerSequelizeModels} from "./apps/media-manager/MediaManagerModels";
import {ReactQuillApp} from "./apps/quill-editor/ReactQuill";

process.env.AP_PASSWORD_SALT = "FIXTURE"

// Clean temp folder
if (!process.env.NO_SEED_DATA || process.env.CLEAN_TMP) await cleanTempFolder();
process.env.JWT_SECRET = "fixture-jwt-secret"


const ormType = process.env.ORM ?? "sequelize";
let adminizer: Adminizer;

if (ormType === "sequelize") {
    const tmpDir = path.join(process.cwd(), ".tmp");
    const dbPath = path.join(tmpDir, "adminizer_fixture.sqlite");
    const orm = new Sequelize({
        dialect: "sqlite",
        storage: dbPath,
        logging: false,
    });
    await orm.authenticate();
    registerSequelizeSystemModels(orm);
    orm.addModels([ExampleSequelize, TestSequelize, JsonSchemaSequelize, CategorySequelize, TestCatalogSequelize]);
    TestSequelize.associate(orm);
    ExampleSequelize.associate(orm);

    await orm.sync({});
    const sequelizeAdapter = new SequelizeAdapter(orm);
    adminizer = new Adminizer([sequelizeAdapter]);
    await ormSharedFixtureLift(adminizer);

    if (!process.env.NO_SEED_DATA) {
        try {
            await seedDatabase(orm.models, 77);
            console.log("Database seeded with random data!");
        } catch (seedErr) {
            console.error("Error during database seeding:", seedErr);
        }
    }

    // Enable debug logging
    Adminizer.logger.level = 'debug';
} else if (ormType === "typeorm") {
    const tmpDir = path.join(process.cwd(), ".tmp");
    const dbPath = path.join(tmpDir, "adminizer_fixture_typeorm.sqlite");
    const dataSource = new DataSource({
        type: "sqlite",
        database: dbPath,
        entities: [
            ...typeOrmSystemModels,
            ExampleTypeOrm,
            TestTypeOrm,
            JsonSchemaTypeOrm,
            CategoryTypeOrm,
            TestCatalogTypeOrm,
        ],
        synchronize: process.env.ORM_ALTER !== "false",
        logging: false,
    });

    await dataSource.initialize();

    const typeOrmAdapter = new TypeOrmAdapter(dataSource);
    adminizer = new Adminizer([typeOrmAdapter]);
    await ormSharedFixtureLift(adminizer);

    if (!process.env.NO_SEED_DATA) {
        try {
            await seedTypeOrmDatabase(dataSource, 77);
            console.log("TypeORM database seeded with random data!");
        } catch (seedErr) {
            console.error("Error during TypeORM database seeding:", seedErr);
        }
    }

    Adminizer.logger.level = 'debug';
} else {
    throw new Error(`Unsupported fixture ORM "${ormType}". Supported ORM: sequelize, typeorm`);
}

// Finish


async function cleanTempFolder() {
    const tmpPath = path.join(process.cwd(), '.tmp');
    try {
        const stats = await fs.stat(tmpPath);
        if (stats.isDirectory()) {
            await fs.rm(tmpPath, {recursive: true});
            console.log(`Temporary folder ${tmpPath} cleaned successfully`);
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Error cleaning temporary folder: ${err.message}`);
        }
    }
}

/**
 * Shared fixture setup
 * @param adminizer
 */
async function ormSharedFixtureLift(adminizer: Adminizer) {
    process.env.ROUTE_PREFIX = adminpanelConfig.routePrefix;

    // Test cors
    adminizer.emitter.on('adminizer:loaded', () => {
        corsApi(adminizer)
    });

    // adminizer.emitter.on('app:enabled', (data) => {
    //     console.log(data)
    // })

    try {

        // Stamp startup time into the version label
        const startedAt = new Date().toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });
        if (adminpanelConfig.showVersion && typeof adminpanelConfig.showVersion === 'object') {
            (adminpanelConfig.showVersion as any).text = startedAt;
        }

        await adminizer.init(adminpanelConfig as unknown as AdminpanelConfig)


        await adminizer.appManager.enable(new ReactQuillApp());

        if (ormType === "sequelize") {
            const sequelizeAdapter = adminizer.getOrmAdapter("sequelize") as SequelizeAdapter;
            await installMediaManagerSequelizeModels(sequelizeAdapter.sequelize, true);
            await adminizer.appManager.enable(new MediaManagerApp({
                ...adminpanelConfig.mediamanager!,
            }));
            await installNavigationSequelizeModel(
                sequelizeAdapter.sequelize,
                navigationAppConfig.model ?? navigationModelName,
                true
            );
            await adminizer.appManager.enable(new NavigationApp({
                ...navigationAppConfig,
            }));
        }

        // add ComponentB -- test module
        await adminizer.appManager.enable(new ComponentBApp());

        // add ModuleManager -- module manager
        await adminizer.appManager.enable(new ModuleManagerApp());



        if (ormType === "typeorm") {
            adminizer.customFilterHandler.add(new TypeOrmExampleJsonCustomFilterHandler(), {force: true});
            adminizer.customFilterHandler.add(new TypeOrmExampleDatatablePriceRangeFilterHandler(), {force: true});
        } else {
            adminizer.customFilterHandler.add(new ExampleJsonCustomFilterHandler(), {force: true});
            adminizer.customFilterHandler.add(new ExampleDatatablePriceRangeFilterHandler(), {force: true});
        }

        if (adminizer.config.aiAssistant?.enabled) {
            // Dynamic import to avoid loading OpenAI dependencies when AI assistant is disabled
            const {OpenAiDataAgentService} = await import("./helpers/ai/OpenAiDataAgentService");
            const openAiAgent = new OpenAiDataAgentService(adminizer);
            if (openAiAgent.isEnabled()) {
                adminizer.aiAssistantHandler!.registerModel(openAiAgent);

                if (adminizer.config.aiAssistant) {
                    const declaredModels = new Set(adminizer.config.aiAssistant.models ?? []);
                    declaredModels.add(openAiAgent.id);
                    adminizer.config.aiAssistant.models = Array.from(declaredModels);

                    if (!adminizer.config.aiAssistant.defaultModel || adminizer.config.aiAssistant.defaultModel === 'dummy') {
                        adminizer.config.aiAssistant.defaultModel = openAiAgent.id;
                    }
                }
                console.log(`[fixture] OpenAI data agent successfully registered with ID: ${openAiAgent.id}`);
            } else {
                Adminizer.log.warn('[fixture] Skipping OpenAI data agent registration because OPENAI_API_KEY is missing.');
            }
        }

        // Register fixture feedback handler (saves to .tmp/feedback/)
        const feedbackHandler = new FileFeedbackHandler();
        feedbackHandler.triggerLabel = '🐛 Found a bug?';
        feedbackHandler.placeholder = 'Tell us what broke — or what you were doing when it broke. We promise not to laugh. (We might laugh a little.)';
        adminizer.feedbackHandler.register(feedbackHandler);

        adminizer.widgetHandler.add(new SwitcherOne());
        adminizer.widgetHandler.add(new SwitcherTwo());
        adminizer.widgetHandler.add(new SiteLinks());
        adminizer.widgetHandler.add(new InfoOne());
        adminizer.widgetHandler.add(new InfoTwo());
        adminizer.widgetHandler.add(new Info3());
        adminizer.widgetHandler.add(new Info4());
        adminizer.widgetHandler.add(new ActionOne());
        adminizer.widgetHandler.add(new ActionTwo());

        /** Custom widget */
        adminizer.widgetHandler.add(new CustomOne(adminizer.config.routePrefix));

        /** Test Catalog */
        adminizer.catalogHandler.add(new TestCatalog(adminizer, 'testcatalog'))

        /** Seed navigation — wait for StorageService to finish loading before writing */
        if (!process.env.NO_SEED_DATA) {
            const navCatalog = adminizer.catalogHandler.getCatalog('navigation') as any;
            if (navCatalog?.storageServices) {
                await navCatalog.storageServices.ready();
            }
            await seedNavigation(adminizer);
        }

        /** Test notifications */
        //setTimeout(() => sendNotificationsWithDelay(adminizer, {count: 150, onlyGeneral: false, generalRatio: 0.5, delayMs: 300}), 5000); // Initial delay 10 seconds

    } catch (e) {
        console.log(e)
    }

    // Start server
    const mainApp = express();

    // Add cookie parser
    mainApp.use(cookieParser());

    // Middleware for Vite
    mainApp.use((req, res, next) => {
        if (
            req.url.startsWith('/@vite') ||
            req.url.startsWith('/@id') ||
            req.url.startsWith('/src/assets') ||
            req.url.startsWith('/@react-refresh') ||
            req.url.startsWith('/node_modules') ||
            req.url.startsWith('/@fs') ||
            req.url.startsWith('/modules') ||
            req.url.startsWith('/fixture/apps')
        ) {
            adminizer.vite.middlewares(req, res, next);
        } else {
            next();
        }
    });

    // Middleware for Adminizer
    mainApp.use(adminizer.getMiddleware());

    // Custom route
    mainApp.get('/nav', async (req, res) => {
        try {
            const navigationModel = adminizer.modelHandler.model.get(navigationModelName) as any;
            const header = navigationModel
                ? await navigationModel.findOne({where: {label: 'header'}})
                : null;
            res.json({header: header});
        } catch (error) {
            res.status(500).json({error: 'Internal server error'});
        }
    });

    // Route for the main page
    mainApp.get('/', async (req, res) => {
        try {
            const [header, footer] = await Promise.all([
                getNavigationSection('header'),
                getNavigationSection('footer'),
            ]);

            res.type('html').send(renderIndexPage(adminpanelConfig.routePrefix, {header, footer}));
        } catch (error) {
            console.error(error);
            res.status(500).send('Navigation preview rendering failed');
        }
    });

    // Error handling
    mainApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });

    // 404 handler
    mainApp.use((req, res) => {
        res.status(404).send('Not Found');
    });

    const server = http.createServer(mainApp);
    server.listen(3000, () => {
        console.log('MainApp listening on http://localhost:3000');
    });
}


async function getNavigationSection(section: string): Promise<NavTreeNode[]> {
    const navigationModel = adminizer.modelHandler.model.get(navigationModelName) as any;
    if (!navigationModel) {
        return [];
    }

    const navigationRecord = await navigationModel.findOne({where: {label: section}});
    return navigationRecord?.tree ?? [];
}

async function seedNavigation(adminizer: Adminizer) {
    const routePrefix = adminpanelConfig.routePrefix;
    try {
        const catalog = adminizer.catalogHandler.getCatalog('navigation') as any;
        if (!catalog) {
            console.warn('seedNavigation: navigation catalog not found');
            return;
        }

        const seedSection = async (section: string, tree: NavTreeNode[]) => {
            const storage = catalog.storageServices.get(section);
            if (!storage) {
                console.warn(`seedNavigation: storage "${section}" not found`);
                return;
            }
            // Only seed if storage is empty
            const existing = await storage.findElementsByParentId(null, null);
            if (existing.length > 0) return;
            await storage.populateFromTree(tree);
            await storage.saveToDB();
            console.log(`Navigation ${section} seeded`);
        };

        // header
        const headerTree: NavTreeNode[] = [
            {
                id: 'h-group-docs',
                name: 'Documentation',
                type: 'group',
                parentId: null,
                sortOrder: 0,
                icon: 'folder',
                visible: true,
                children: [
                    {
                        id: 'h-link-docs-install',
                        name: 'Install',
                        type: 'link',
                        parentId: 'h-group-docs',
                        sortOrder: 0,
                        icon: 'link',
                        urlPath: 'https://docs.adminizer.org/Install.html',
                        targetBlank: true,
                        visible: true,
                        children: [],
                    },
                    {
                        id: 'h-link-docs-controls',
                        name: 'Controls',
                        type: 'link',
                        parentId: 'h-group-docs',
                        sortOrder: 1,
                        icon: 'link',
                        urlPath: 'https://docs.adminizer.org/Controls.html',
                        targetBlank: true,
                        visible: true,
                        children: [],
                    },
                    {
                        id: 'h-link-docs-navigation',
                        name: 'Navigation Catalog',
                        type: 'link',
                        parentId: 'h-group-docs',
                        sortOrder: 2,
                        icon: 'link',
                        urlPath: 'https://docs.adminizer.org/Navigation.html',
                        targetBlank: true,
                        visible: true,
                        children: [],
                    },
                ],
            },
            {
                id: 'h-group-admin',
                name: 'Adminizer',
                type: 'group',
                parentId: null,
                sortOrder: 1,
                icon: 'folder',
                visible: true,
                children: [
                    {
                        id: 'h-link-admin-home',
                        name: 'Dashboard',
                        type: 'link',
                        parentId: 'h-group-admin',
                        sortOrder: 0,
                        icon: 'link',
                        urlPath: routePrefix,
                        targetBlank: false,
                        visible: true,
                        children: [],
                    },
                    {
                        id: 'h-link-admin-examples',
                        name: 'All Controls (Example)',
                        type: 'link',
                        parentId: 'h-group-admin',
                        sortOrder: 1,
                        icon: 'link',
                        urlPath: `${routePrefix}/model/Example`,
                        targetBlank: false,
                        visible: true,
                        children: [],
                    },
                    {
                        id: 'h-link-admin-test',
                        name: 'Test Model',
                        type: 'link',
                        parentId: 'h-group-admin',
                        sortOrder: 2,
                        icon: 'link',
                        urlPath: `${routePrefix}/model/Test`,
                        targetBlank: false,
                        visible: true,
                        children: [],
                    },
                    {
                        id: 'h-link-admin-categories',
                        name: 'Categories',
                        type: 'link',
                        parentId: 'h-group-admin',
                        sortOrder: 3,
                        icon: 'link',
                        urlPath: `${routePrefix}/model/Category`,
                        targetBlank: false,
                        visible: true,
                        children: [],
                    },
                ],
            },
        ];
        await seedSection('header', headerTree);

        // footer
        const footerTree: NavTreeNode[] = [
            {
                id: 'f-link-home',
                name: 'Home',
                type: 'link',
                parentId: null,
                sortOrder: 0,
                icon: 'link',
                urlPath: '/',
                targetBlank: false,
                visible: true,
                children: [],
            },
            {
                id: 'f-group-links',
                name: 'Links',
                type: 'group',
                parentId: null,
                sortOrder: 1,
                icon: 'folder',
                visible: true,
                children: [
                    {
                        id: 'f-link-github',
                        name: 'GitHub',
                        type: 'link',
                        parentId: 'f-group-links',
                        sortOrder: 0,
                        icon: 'link',
                        urlPath: 'https://github.com/adminizer',
                        targetBlank: true,
                        visible: true,
                        children: [],
                    },
                    {
                        id: 'f-link-docs',
                        name: 'Documentation',
                        type: 'link',
                        parentId: 'f-group-links',
                        sortOrder: 1,
                        icon: 'link',
                        urlPath: 'https://docs.adminizer.org/Install.html',
                        targetBlank: true,
                        visible: true,
                        children: [],
                    },
                ],
            },
        ];
        await seedSection('footer', footerTree);
    } catch (e) {
        console.error('seedNavigation error:', e);
    }
}
