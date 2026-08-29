// Load environment variables from .env file
import dotenv from 'dotenv';

dotenv.config();
import "reflect-metadata";

import {Adminizer, FileDocumentation, SequelizeAdapter, TypeOrmAdapter} from "../dist";
import http from 'http';
import adminpanelConfig from "./adminizerConfig";
import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";
import {sendNotificationsWithDelay} from "./helpers/notifications";
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
import {DataSource} from "typeorm";
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
import {NotificationSenderApp} from "./apps/notification-sender/NotificationSenderApp";
import {ModuleManagerApp} from "./apps/module-manager/ModuleManagerApp";
import {NavigationApp} from "./apps/navigation/NavigationApp";
import {navigationAppConfig} from "./apps/navigation/navigationConfig";
import {installNavigationSequelizeModel, navigationModelName} from "./apps/navigation/NavigationModel";
import {MediaManagerApp} from "./apps/media-manager/MediaManagerApp";
import {installMediaManagerSequelizeModels} from "./apps/media-manager/MediaManagerModels";
import {ReactQuillApp} from "./apps/quill-editor/ReactQuill";
import {WidgetsApp} from "./apps/widgets/WidgetsApp";
import {HandsontableTestApp} from "./apps/handsontable-test/HandsontableTestApp";
import {AiAssistantApp} from "./apps/ai-assistant/AiAssistantApp";
import {RecordScopeTestApp} from "./apps/record-scope-test/RecordScopeTestApp";
import {ProjectGraphApp} from "./apps/project-graph/ProjectGraphApp";
import {installProjectGraphSequelizeModels} from "./apps/project-graph/ProjectGraphModels";
import {projectGraphTypeOrmModels} from "./apps/project-graph/ProjectGraphTypeOrmModels";

// Kept out of the lift: the demo grants name Test records by id and are assigned to the
// fixture users, so they can only be written once the host has seeded both.
const recordScopeTestApp = new RecordScopeTestApp();

process.env.AP_PASSWORD_SALT = "FIXTURE"

const TMP_DIR = path.join(process.cwd(), ".tmp");
const SEQUELIZE_DB_PATH = path.join(TMP_DIR, "adminizer_fixture.sqlite");
const TYPEORM_DB_PATH = path.join(TMP_DIR, "adminizer_fixture_typeorm.sqlite");

// CLEAN_TMP wipes the whole .tmp folder, seeding only drops the database files
if (process.env.CLEAN_TMP) {
    await cleanTempFolder();
} else if (!process.env.NO_SEED_DATA) {
    await cleanDatabaseFiles();
}
process.env.JWT_SECRET = "fixture-jwt-secret"


const ormType = process.env.ORM ?? "sequelize";
// The Project -> Task -> Message access-graph demo lives entirely in its own app:
// ENABLE_PROJECT_GRAPH=false removes its models, its graph and its panel sections.
const projectGraphEnabled = (process.env.ENABLE_PROJECT_GRAPH ?? "true") === "true";
const projectGraphApp = projectGraphEnabled ? new ProjectGraphApp() : undefined;
let adminizer: Adminizer;
const fixtureSystemModels = {
    User: "UserAP",
    Group: "GroupAP",
    Filter: "FilterAP",
    FilterColumn: "FilterColumnAP",
    HistoryActions: "HistoryActionsAP",
    Notification: "NotificationAP",
    UserNotification: "UserNotificationAP",
};

if (ormType === "sequelize") {
    const dbPath = SEQUELIZE_DB_PATH;
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
    const sequelizeAdapter = new SequelizeAdapter(orm, {
        systemModels: fixtureSystemModels,
    });
    adminizer = new Adminizer([sequelizeAdapter]);
    await ormSharedFixtureLift(adminizer);

    if (!process.env.NO_SEED_DATA) {
        try {
            await seedDatabase(orm.models, 77);
            console.log("Database seeded with random data!");
            await projectGraphApp?.seedDemoData();
        } catch (seedErr) {
            console.error("Error during database seeding:", seedErr);
        }
    }

    await seedRecordScopeDemo();

    // Enable debug logging
    Adminizer.logger.level = 'debug';
} else if (ormType === "typeorm") {
    const dbPath = TYPEORM_DB_PATH;
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
            // App entities must be known before initialize() - TypeORM cannot add them later
            ...(projectGraphEnabled ? projectGraphTypeOrmModels : []),
        ],
        synchronize: process.env.ORM_ALTER !== "false",
        logging: false,
    });

    await dataSource.initialize();

    const typeOrmAdapter = new TypeOrmAdapter(dataSource, {
        systemModels: fixtureSystemModels,
    });
    adminizer = new Adminizer([typeOrmAdapter]);
    await ormSharedFixtureLift(adminizer);

    if (!process.env.NO_SEED_DATA) {
        try {
            await seedTypeOrmDatabase(dataSource, 77);
            console.log("TypeORM database seeded with random data!");
            await projectGraphApp?.seedDemoData();
        } catch (seedErr) {
            console.error("Error during TypeORM database seeding:", seedErr);
        }
    }

    await seedRecordScopeDemo();

    Adminizer.logger.level = 'debug';
} else {
    throw new Error(`Unsupported fixture ORM "${ormType}". Supported ORM: sequelize, typeorm`);
}

// Finish


/** Idempotent, and a no-op while the Test table is empty — safe on every boot. */
async function seedRecordScopeDemo() {
    try {
        await recordScopeTestApp.seedDemoData();
    } catch (err) {
        console.error("Error during record-scope demo seeding:", err);
    }
}

async function cleanTempFolder() {
    try {
        const stats = await fs.stat(TMP_DIR);
        if (stats.isDirectory()) {
            await fs.rm(TMP_DIR, {recursive: true});
            console.log(`Temporary folder ${TMP_DIR} cleaned successfully`);
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Error cleaning temporary folder: ${err.message}`);
        }
    }
    await fs.mkdir(TMP_DIR, {recursive: true});
}

/**
 * Drops only the fixture database files, keeping the rest of .tmp
 * (media manager uploads, feedback, openharness state, ...) intact.
 */
async function cleanDatabaseFiles() {
    await fs.mkdir(TMP_DIR, {recursive: true});
    for (const dbPath of [SEQUELIZE_DB_PATH, TYPEORM_DB_PATH]) {
        // sqlite may keep sidecar files alongside the database
        for (const file of [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`]) {
            try {
                await fs.rm(file, {force: true});
            } catch (err) {
                console.error(`Error removing database file ${file}: ${err.message}`);
            }
        }
    }
    console.log(`Fixture databases removed from ${TMP_DIR}`);
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
            if (projectGraphEnabled) {
                // An app registers models with the panel, but the tables belong to the host ORM
                await installProjectGraphSequelizeModels(sequelizeAdapter.sequelize, true, {
                    user: fixtureSystemModels.User,
                    group: fixtureSystemModels.Group,
                });
            }
        }

        // add ProjectGraph -- the accessGraph demo: Project -> Task -> Message
        // (its demo data is seeded by the host below, once the fixture users exist)
        if (projectGraphApp) {
            await adminizer.appManager.enable(projectGraphApp);
        }

        // add NotificationSender -- user message notification sender
        await adminizer.appManager.enable(new NotificationSenderApp());

        // add Widgets -- dashboard widgets registered through AppManager
        await adminizer.appManager.enable(new WidgetsApp());

        // add HandsontableTest -- production JSComponents smoke test
        await adminizer.appManager.enable(new HandsontableTestApp());

        // add RecordScopeTest -- contextual access token granted per Test record
        await adminizer.appManager.enable(recordScopeTestApp);

        const aiAssistantApp = new AiAssistantApp({
            defaultModel: adminizer.config.aiAssistant?.defaultModel,
            models: adminizer.config.aiAssistant?.models ?? ["openharness", "openai-data", "dummy"],
        });
        adminizer.appManager.register(aiAssistantApp);
        if (adminizer.config.aiAssistant?.enabled) {
            await adminizer.appManager.enable(aiAssistantApp.name);
        }

        // add ModuleManager -- module manager
        await adminizer.appManager.enable(new ModuleManagerApp());



        if (ormType === "typeorm") {
            adminizer.customFilterHandler.add(new TypeOrmExampleJsonCustomFilterHandler(), {force: true});
            adminizer.customFilterHandler.add(new TypeOrmExampleDatatablePriceRangeFilterHandler(), {force: true});
        } else {
            adminizer.customFilterHandler.add(new ExampleJsonCustomFilterHandler(), {force: true});
            adminizer.customFilterHandler.add(new ExampleDatatablePriceRangeFilterHandler(), {force: true});
        }

        // Register the demo knowledge base: the file-based reference
        // implementation over fixture/documentation/
        adminizer.documentationHandler.register(new FileDocumentation({
            dir: path.resolve(import.meta.dirname, 'documentation'),
            watch: true,
        }));
        // A document author references existing tokens; this custom one backs
        // the `accessRightsToken` of fixture/documentation/secret-operations.md
        adminizer.accessRightsHelper.registerToken({
            id: 'read-secret-operations-doc',
            name: 'Secret operations doc',
            description: 'Access to the "Secret operations" demo document',
            department: 'documentation',
        });

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
            req.url.startsWith('/fixture/apps') ||
            req.url.startsWith('/fixture/widgets') ||
            req.url.startsWith('/fixture/virtual-catalog')
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
            const navigationModel = getNavigationModel();
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
    const navigationModel = getNavigationModel();
    if (!navigationModel) {
        return [];
    }

    const navigationRecord = await navigationModel.findOne({where: {label: section}});
    return navigationRecord?.tree ?? [];
}

function getNavigationModel() {
    const navigationModels = adminizer.modelHandler.createAppAccess("navigation");
    return navigationModels.has(navigationModelName)
        ? navigationModels.get<any>(navigationModelName)
        : undefined;
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
