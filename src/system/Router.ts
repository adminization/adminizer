import _dashboard from "../controllers/dashboard";
import _welcome from "../controllers/welcome";
import _list from "../controllers/list";
import _edit from "../controllers/edit";
import _add from "../controllers/add";
import _view from "../controllers/view";
import _remove from "../controllers/remove";
import _inlineUpdate from "../controllers/inlineUpdate";
import _filterFields from "../controllers/filter-fields/filterFields";
import { getSavedFilters, saveFilter, deleteFilter, applyTemporaryFilter, getTemporaryFilter, getFilterLocales } from "../controllers/filter-fields/savedFilters";
import { getAllUserFilters } from "../controllers/filter-fields/getAllUserFilters";
import { getModelColumns, updateFilterColumns } from "../controllers/filter-fields/columns";
import { getAllGroups } from "../controllers/filter-fields/groups";
import { ckEditorUpload } from "../controllers/ckeditorUpload";
import _exportData from "../controllers/exportData";
import _feed from "../controllers/feed";
import { getUserApiKey, regenerateUserApiKey } from "../controllers/userApiKey";
import _form from "../controllers/form";
import { CreateUpdateConfig } from "../interfaces/adminpanelConfig";
import { widgetSwitchController } from "../controllers/widgets/switch";
import _getAllWidgets from "../controllers/getAllWidgets";
import _widgetsDB from "../controllers/widgetsDB";
import { widgetInfoController } from '../controllers/widgets/Info';
import { widgetActionController } from '../controllers/widgets/Action';
import { widgetCustomController } from "../controllers/widgets/Custom";
import { widgetFilterInfoController } from "../controllers/widgets/filterInfo";
import { catalogController } from "../controllers/catalog/Catalog";
import { mediaManagerController } from "../controllers/media-manager/mediaManagerApi";
import { thumbController } from "../controllers/media-manager/ThumbController";
import { Adminizer } from "../lib/Adminizer";
import timezones from "../controllers/timezones";
import { NotificationController } from "../controllers/notifications/NotificationController";
import { AiAssistantController } from "../controllers/ai/AiAssistantController";
import { HistoryController } from "../controllers/history-actions/HistoryController";
import listUserFilters from "../controllers/listUserFilters";
import {
    requireAdmin,
    requireAnyPermission,
    requireAuthAPI,
    requireAuthEnabled,
    requireAuthUI,
    requirePermission
} from "../middlewares/authGuards";
import {
    aiModelToken,
    catalogToken,
    formCreateToken,
    formUpdateToken,
    historyToken,
    mediaManagerToken,
    modelCreateToken,
    modelDeleteToken,
    modelReadToken,
    modelUpdateToken,
    widgetToken,
    widgetsToken
} from "../middlewares/permissionResolvers";
import { bindWithPolicies } from "./routeGuards";

export default class Router {
    public adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer;
    }

    onlyOnce: boolean = false;

    /** Regexp patterns of model routes registered via bindModelRoutes, keyed by model name */
    private modelRoutePatterns: Map<string, RegExp[]> = new Map();

    /**
     * The idea is that all methods within the first 3 seconds after start call this method, and as soon as all have been loaded, the loading will be blocked
     */
    async bind(): Promise<void> {

        if (this.onlyOnce) {
            Adminizer.log.error(`Method "Router.bind(...)" allowed for run only one time`);
            return;
        }
        
        const adminizer = this.adminizer

        if (
            typeof adminizer.defaultMiddleware === 'function' &&
            adminizer.defaultMiddleware.length >= 3 &&
            adminizer.defaultMiddleware.length <= 4
        ) {
            adminizer.app.use(adminizer.defaultMiddleware);
        }

        /**
         * List or one policy that should be bound to actions
         * @type {MiddlewareType[]}
         */
        let policies: MiddlewareType[] = adminizer.config.policies;
        const withGuards = (action: MiddlewareType, ...guards: MiddlewareType[]) =>
            bindWithPolicies(adminizer, policies, action, guards);

        /**
         * Prevent stale/cached admin API responses.
         * This protects JSON endpoints from browser/proxy cache and avoids
         * old HTML redirects being reused as API payloads.
         */
        const noCachePrefixes = [
            '/api',
            '/notifications/api',
            '/history',
            '/widgets-get-all',
            '/widgets-get-all-db',
            '/widgets-switch',
            '/widgets-info',
            '/widgets-action',
            '/media-manager-uploader',
            '/get-thumbs',
            '/get-timezones',
        ];
        adminizer.app.use(adminizer.config.routePrefix, (req, res, next) => {
            const requestPath = req.path || '/';
            const shouldDisableCache = noCachePrefixes.some((prefix) =>
                requestPath === prefix || requestPath.startsWith(`${prefix}/`)
            );

            if (shouldDisableCache) {
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.set('Pragma', 'no-cache');
                res.set('Expires', '0');
                res.set('Surrogate-Control', 'no-store');
            }

            return next();
        });

        /**
         * Widgets All
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-get-all`,
            withGuards(_getAllWidgets, requireAuthUI(), requirePermission(widgetsToken, { mode: "ui" }))
        );

        /**
         * Widgets All from DB
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-get-all-db`,
            withGuards(_widgetsDB, requireAuthUI(), requirePermission(widgetsToken, { mode: "ui" }))
        );


        /**
         * Widgets Switch
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-switch/:widgetId`,
            withGuards(widgetSwitchController, requireAuthUI(), requirePermission(widgetToken, { mode: "ui" }))
        );

        /**
         * Widgets Info
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-info/:widgetId`,
            withGuards(widgetInfoController, requireAuthUI(), requirePermission(widgetToken, { mode: "ui" }))
        )

        /**
         * Widgets Filter Info (built-in filter widgets)
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-filter-info/:filterId`,
            withGuards(widgetFilterInfoController, requireAuthUI(), requirePermission(widgetsToken, { mode: "ui" }))
        );

        /**
         * Widgets Action
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-action/:widgetId`,
            withGuards(widgetActionController, requireAuthUI(), requirePermission(widgetToken, { mode: "ui" }))
        );

        /**
         * Widgets Custom
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/widgets-action/:widgetId`,
            withGuards(widgetCustomController, requireAuthUI(), requirePermission(widgetToken, { mode: "ui" }))
        );

        /**
         * Edit form
         * */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/form/:slug`,
            withGuards(_form, requireAuthUI(), requirePermission(formUpdateToken, { mode: "ui" }))
        );

        /**
         *  Create a base entity route
         */
        const entityRoutes = (suffix = '') => [
            `${adminizer.config.routePrefix}/form/:entityName${suffix}`,
            `${adminizer.config.routePrefix}/model/:entityName${suffix}`,
        ];

        /**
         * Catalog
         */
        adminizer.app.all(
            `${adminizer.config.routePrefix}/catalog/:slug/:id`,
            withGuards(catalogController, requireAuthUI(), requirePermission(catalogToken, { mode: "ui" }))
        );
        adminizer.app.all(
            `${adminizer.config.routePrefix}/catalog/:slug`,
            withGuards(catalogController, requireAuthUI(), requirePermission(catalogToken, { mode: "ui" }))
        );

        /**
         * Media Manager
         */
        adminizer.app.post(
            `${adminizer.config.routePrefix}/media-manager-uploader/:id/upload`,
            withGuards(mediaManagerController, requireAuthUI(), requirePermission(mediaManagerToken, { mode: "ui" }))
        );
        adminizer.app.post(
            `${adminizer.config.routePrefix}/media-manager-uploader/:id/upload-variant`,
            withGuards(mediaManagerController, requireAuthUI(), requirePermission(mediaManagerToken, { mode: "ui" }))
        );
        adminizer.app.all(
            `${adminizer.config.routePrefix}/media-manager-uploader/:id`,
            withGuards(mediaManagerController, requireAuthUI(), requirePermission(mediaManagerToken, { mode: "ui" }))
        );
        adminizer.app.all(`${adminizer.config.routePrefix}/get-thumbs`, adminizer.policyManager.bindPolicies(policies, thumbController));

        /**
         * Upload images CKeditor5
         */
        adminizer.app.post(
            entityRoutes('/ckeditor5/upload'),
            withGuards(
                ckEditorUpload,
                requireAuthUI(),
                requireAnyPermission(
                    [
                        modelUpdateToken,
                        modelCreateToken,
                        formUpdateToken,
                        formCreateToken,
                    ],
                    { mode: "ui" }
                )
            )
        );

        /**
         * Notifications
         */
        if (adminizer.config.notifications.enabled) {
            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications`,
                withGuards(NotificationController.viewAll, requireAuthUI())
            );
            adminizer.app.post(
                `${adminizer.config.routePrefix}/notifications`,
                withGuards(NotificationController.viewAll, requireAuthAPI())
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api/stream`,
                withGuards(NotificationController.getNotificationsStream, requireAuthAPI())
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api/get-classes`,
                withGuards(NotificationController.getNotificationClasses, requireAuthAPI())
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api/:notificationClass`,
                withGuards(NotificationController.getNotificationsByClass, requireAuthAPI())
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api`,
                withGuards(NotificationController.getUserNotifications, requireAuthAPI())
            );

            adminizer.app.put(
                `${adminizer.config.routePrefix}/notifications/api/:notificationClass/:id/read`,
                withGuards(NotificationController.markAsRead, requireAuthAPI())
            );

            adminizer.app.put(
                `${adminizer.config.routePrefix}/notifications/api/read-all`,
                withGuards(NotificationController.markAllAsRead, requireAuthAPI())
            );

            adminizer.app.post(
                `${adminizer.config.routePrefix}/notifications/api/search`,
                withGuards(NotificationController.search, requireAuthAPI())
            );
        }

        /**
         * History-actions
         */
        if (adminizer.config.history?.enabled) {
            adminizer.app.get(
                `${adminizer.config.routePrefix}/history/view-all`,
                withGuards(
                    HistoryController.index,
                    requireAuthUI(),
                    requirePermission(historyToken, { mode: "ui" })
                )
            )
            adminizer.app.post(
                `${adminizer.config.routePrefix}/history/view-all`,
                withGuards(HistoryController.index, requireAuthAPI(), requirePermission(historyToken))
            )
            adminizer.app.post(
                `${adminizer.config.routePrefix}/history/get-model-history`,
                withGuards(HistoryController.getAllModelHistory, requireAuthAPI(), requirePermission(historyToken))
            );
            adminizer.app.post(
                `${adminizer.config.routePrefix}/history/get-model-fields`,
                withGuards(HistoryController.getModelFieldsHistory, requireAuthAPI(), requirePermission(historyToken))
            )
        }


        if (adminizer.config.aiAssistant?.enabled) {
            adminizer.app.get(
                `${adminizer.config.routePrefix}/api/ai-assistant/models`,
                withGuards(AiAssistantController.getModels, requireAuthAPI())
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/api/ai-assistant/history/:modelId`,
                withGuards(AiAssistantController.getHistory, requireAuthAPI(), requirePermission(aiModelToken))
            );

            adminizer.app.post(
                `${adminizer.config.routePrefix}/api/ai-assistant/query`,
                withGuards(AiAssistantController.sendMessage, requireAuthAPI(), requirePermission(aiModelToken))
            );

            adminizer.app.delete(
                `${adminizer.config.routePrefix}/api/ai-assistant/history/:modelId`,
                withGuards(AiAssistantController.resetHistory, requireAuthAPI(), requirePermission(aiModelToken))
            );
        }

        /**
         * List of records
         */
        adminizer.app.all(
            entityRoutes(),
            withGuards(_list, requireAuthUI(), requirePermission(modelReadToken, { mode: "ui" }))
        );

        if (adminizer.config.filters?.enabled) {

            /**
             * Get filter fields for model
             */
            adminizer.app.get(
                entityRoutes('/filter-fields'),
                withGuards(_filterFields, requireAuthAPI(), requirePermission(modelReadToken))
            );

            /**
             * Saved filters
             */
            adminizer.app.get(
                entityRoutes('/saved-filters'),
                withGuards(getSavedFilters, requireAuthAPI(), requirePermission(modelReadToken))
            );
            adminizer.app.get(
                entityRoutes('/filter/locales'),
                withGuards(getFilterLocales, requireAuthAPI(), requirePermission(modelReadToken))
            );
            adminizer.app.get(
                entityRoutes('/filter/temporary'),
                withGuards(getTemporaryFilter, requireAuthAPI(), requirePermission(modelReadToken))
            );
            adminizer.app.post(
                entityRoutes('/filter'),
                withGuards(saveFilter, requireAuthAPI(), requirePermission(modelReadToken))
            );
            adminizer.app.post(
                entityRoutes('/filter/apply'),
                withGuards(applyTemporaryFilter, requireAuthAPI(), requirePermission(modelReadToken))
            );
            adminizer.app.delete(
                entityRoutes('/filter/:id'),
                withGuards(deleteFilter, requireAuthAPI(), requirePermission(modelReadToken))
            );

            /**
             * Get all groups (for admin filter visibility settings)
             */
            adminizer.app.get(
                `${adminizer.config.routePrefix}/groups`,
                withGuards(getAllGroups, requireAuthAPI(), requireAdmin())
            );

            /**
             * Export data (JSON, CSV, XLSX)
             */
            adminizer.app.post(
                entityRoutes('/export'),
                withGuards(_exportData, requireAuthAPI(), requirePermission(modelReadToken))
            );

            /**
             * Public feed API — export by apiKey without auth
             * GET /adminizer/api/feed/:apiKey.json
             * GET /adminizer/api/feed/:apiKey.xml
             */
            adminizer.app.get(`${adminizer.config.routePrefix}/api/feed/:apiKey.:format`, _feed);
            // Also support without extension (defaults to JSON)
            adminizer.app.get(`${adminizer.config.routePrefix}/api/feed/:apiKey`, _feed);

            /**
             * User Filters — list all filters accessible to the current user across all models
             */
            adminizer.app.get(
                `${adminizer.config.routePrefix}/api/all-user-filters`,
                withGuards(getAllUserFilters, requireAuthAPI())
            );
            adminizer.app.all(
                `${adminizer.config.routePrefix}/user-filters`,
                withGuards(listUserFilters, requireAuthUI())
            );
            /**
            * Get model columns (available columns for the model)
            */
            adminizer.app.get(
                entityRoutes('/columns'),
                withGuards(getModelColumns, requireAuthAPI(), requirePermission(modelReadToken))
            );

            /**
             * Update filter columns configuration
             */
            adminizer.app.post(
                entityRoutes('/filter/:filterId/columns'),
                withGuards(updateFilterColumns, requireAuthAPI(), requirePermission(modelReadToken))
            );
        }

        /**
         * User API Key management
         * GET /adminizer/api/user-key — returns current user's API key
         * POST /adminizer/api/user-key/regenerate — regenerates the API key
         */
        adminizer.app.get(
            `${adminizer.config.routePrefix}/api/user-key`,
            withGuards(getUserApiKey, requireAuthEnabled(), requireAuthAPI())
        );
        adminizer.app.post(
            `${adminizer.config.routePrefix}/api/user-key/regenerate`,
            withGuards(regenerateUserApiKey, requireAuthEnabled(), requireAuthAPI())
        );


        adminizer.app.get(
            `${adminizer.config.routePrefix}/get-timezones`,
            withGuards(timezones, requireAuthUI())
        )

        if (adminizer.config.models) {
            for (let model in adminizer.config.models) {
                await this.bindModelRoutes(model, policies);
            }
        }

        /**
         * Inline update field in list view
         */
        adminizer.app.patch(
            entityRoutes('/inline/:id'),
            withGuards(_inlineUpdate, requireAuthAPI(), requirePermission(modelUpdateToken))
        );

        /**
         * View record details
         */
        adminizer.app.all(
            entityRoutes('/view/:id'),
            withGuards(_view, requireAuthUI(), requirePermission(modelReadToken, { mode: "ui" }))
        );

        /**
         * Remove record
         */
        adminizer.app.all(
            entityRoutes('/remove/:id'),
            withGuards(_remove, requireAuthUI(), requirePermission(modelDeleteToken, { mode: "ui" }))
        );

        /**
         * Create a default dashboard
         */
        if (adminizer.config.dashboard) {
            adminizer.app.all(adminizer.config.routePrefix, withGuards(_dashboard, requireAuthUI()));
        } else {
            adminizer.app.all(adminizer.config.routePrefix, withGuards(_welcome, requireAuthUI()));
        }
        // TODO emit can be used in tests
        adminizer.emitter.emit("router:bound");
    }

    public unbindModelRoutes(model: string): void {
        const routerStack = this.getRouterStack();
        if (!routerStack) return;
        const patterns = this.modelRoutePatterns.get(model);
        if (!patterns?.length) return;
        const removedPaths: string[] = [];
        const filteredStack = routerStack.filter((layer: any) => {
            if (layer.route && patterns.some((p: RegExp) => p.test(layer.route.path))) {
                removedPaths.push(layer.route.path);
                return false;
            }
            return true;
        });
        routerStack.splice(0, routerStack.length, ...filteredStack);
        this.modelRoutePatterns.delete(model);
        Adminizer.log.debug(`Adminpanel removed routes for model \`${model}\`: ${removedPaths.join(', ')}`);
    }

    private getRouterStack(): any[] | null {
        const app = this.adminizer.app as any;
        const router = app.router ?? app._router;
        return Array.isArray(router?.stack) ? router.stack : null;
    }

    public async bindModelRoutes(model: string, policies?: MiddlewareType[]): Promise<void> {
        if (!policies) policies = this.adminizer.config.policies;
        if (this.modelRoutePatterns.has(model)) {
            this.unbindModelRoutes(model);
        }
        
        const modelConfig = this.adminizer.config.models[model];
        const prefix = `${this.adminizer.config.routePrefix}/model/${model}`;

        const registeredPaths: string[] = [];
        const register = (path: string, handler: MiddlewareType, guards: MiddlewareType[] = []) => {
            this.adminizer.app.all(path, bindWithPolicies(this.adminizer, policies!, handler, guards));
            const patterns = this.modelRoutePatterns.get(model) ?? [];
            patterns.push(new RegExp(`^${path.replace(/:[^/]+/g, '[^/]+')}$`));
            this.modelRoutePatterns.set(model, patterns);
            registeredPaths.push(path);
        };

        if (typeof modelConfig === "boolean" && modelConfig === true) {
            Adminizer.log.debug(`Adminpanel create CRUD routes for \`${model}\` by boolean true`);
            register(
                `${prefix}/add`,
                _add,
                [requireAuthUI(), requirePermission(() => `create-${model}-model`, { mode: "ui" })]
            );
            register(
                `${prefix}/edit/:id`,
                _edit,
                [requireAuthUI(), requirePermission(() => `update-${model}-model`, { mode: "ui" })]
            );
            register(
                `${prefix}/remove/:id`,
                _remove,
                [requireAuthUI(), requirePermission(() => `delete-${model}-model`, { mode: "ui" })]
            );
        } else if (modelConfig !== undefined && typeof modelConfig !== "boolean") {
            Adminizer.log.debug(`Adminpanel create CRUD routes for \`${model}\` by ModelConfig`);

            /**
             * Create new record
             */
            const addHandler = modelConfig.add as CreateUpdateConfig;
            if (addHandler?.controller) {
                if (typeof addHandler.controller === 'string') {
                    let controller = await import(addHandler.controller);
                    register(
                        `${prefix}/add`,
                        controller.default,
                        [requireAuthUI(), requirePermission(() => `create-${model}-model`, { mode: "ui" })]
                    );
                } else {
                    register(
                        `${prefix}/add`,
                        addHandler.controller as MiddlewareType,
                        [requireAuthUI(), requirePermission(() => `create-${model}-model`, { mode: "ui" })]
                    );
                }
            } else {
                register(
                    `${prefix}/add`,
                    _add,
                    [requireAuthUI(), requirePermission(() => `create-${model}-model`, { mode: "ui" })]
                );
            }

            /**
             * Edit existing record
             */
            const editHandler = modelConfig.edit as CreateUpdateConfig;
            if (editHandler?.controller) {
                if (typeof editHandler.controller === 'string') {
                    let controller = await import(editHandler.controller);
                    register(
                        `${prefix}/edit/:id`,
                        controller.default,
                        [requireAuthUI(), requirePermission(() => `update-${model}-model`, { mode: "ui" })]
                    );
                } else {
                    register(
                        `${prefix}/edit/:id`,
                        editHandler.controller as MiddlewareType,
                        [requireAuthUI(), requirePermission(() => `update-${model}-model`, { mode: "ui" })]
                    );
                }
            } else {
                register(
                    `${prefix}/edit/:id`,
                    _edit,
                    [requireAuthUI(), requirePermission(() => `update-${model}-model`, { mode: "ui" })]
                );
            }
        } else {
            Adminizer.log.silly(`Adminpanel skip create CRUD routes for model: ${model}`);
        }

        if (registeredPaths.length > 0) {
            Adminizer.log.debug(`Adminpanel added routes for model \`${model}\`: ${registeredPaths.join(', ')}`);
        }
    }
}
