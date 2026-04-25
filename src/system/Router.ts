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
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-get-all`, adminizer.policyManager.bindPolicies(policies, _getAllWidgets));

        /**
         * Widgets All from DB
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-get-all-db`, adminizer.policyManager.bindPolicies(policies, _widgetsDB));


        /**
         * Widgets Switch
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-switch/:widgetId`, adminizer.policyManager.bindPolicies(policies, widgetSwitchController));

        /**
         * Widgets Info
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-info/:widgetId`, adminizer.policyManager.bindPolicies(policies, widgetInfoController))

        /**
         * Widgets Filter Info (built-in filter widgets)
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-filter-info/:filterId`, adminizer.policyManager.bindPolicies(policies, widgetFilterInfoController));

        /**
         * Widgets Action
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-action/:widgetId`, adminizer.policyManager.bindPolicies(policies, widgetActionController));

        /**
         * Widgets Custom
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/widgets-action/:widgetId`, adminizer.policyManager.bindPolicies(policies, widgetCustomController));

        /**
         * Edit form
         * */
        adminizer.app.all(`${adminizer.config.routePrefix}/form/:slug`, adminizer.policyManager.bindPolicies(policies, _form));

        /**
         *  Create a base entity route
         */
        let baseRoute = `${adminizer.config.routePrefix}/:entityType(form|model)/:entityName`;

        /**
         * Catalog
         */
        adminizer.app.all(`${adminizer.config.routePrefix}/catalog/:slug/:id`, adminizer.policyManager.bindPolicies(policies, catalogController));
        adminizer.app.all(`${adminizer.config.routePrefix}/catalog/:slug`, adminizer.policyManager.bindPolicies(policies, catalogController));

        /**
         * Media Manager
         */
        adminizer.app.post(
            `${adminizer.config.routePrefix}/media-manager-uploader/:id/upload`,
            adminizer.policyManager.bindPolicies(policies, mediaManagerController)
        );
        adminizer.app.post(
            `${adminizer.config.routePrefix}/media-manager-uploader/:id/upload-variant`,
            adminizer.policyManager.bindPolicies(policies, mediaManagerController)
        );
        adminizer.app.all(
            `${adminizer.config.routePrefix}/media-manager-uploader/:id`,
            adminizer.policyManager.bindPolicies(policies, mediaManagerController)
        );
        adminizer.app.all(`${adminizer.config.routePrefix}/get-thumbs`, adminizer.policyManager.bindPolicies(policies, thumbController));

        /**
         * Upload images CKeditor5
         */
        adminizer.app.post(`${baseRoute}/ckeditor5/upload`, adminizer.policyManager.bindPolicies(policies, ckEditorUpload));

        /**
         * Notifications
         */
        if (adminizer.config.notifications.enabled) {
            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.viewAll)
            );
            adminizer.app.post(
                `${adminizer.config.routePrefix}/notifications`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.viewAll)
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api/stream`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.getNotificationsStream)
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api/get-classes`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.getNotificationClasses)
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api/:notificationClass`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.getNotificationsByClass)
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/notifications/api`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.getUserNotifications)
            );

            adminizer.app.put(
                `${adminizer.config.routePrefix}/notifications/api/:notificationClass/:id/read`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.markAsRead)
            );

            adminizer.app.put(
                `${adminizer.config.routePrefix}/notifications/api/read-all`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.markAllAsRead)
            );

            adminizer.app.post(
                `${adminizer.config.routePrefix}/notifications/api/search`,
                adminizer.policyManager.bindPolicies(policies, NotificationController.search)
            );
        }

        /**
         * History-actions
         */
        if (adminizer.config.history?.enabled) {
            adminizer.app.get(
                `${adminizer.config.routePrefix}/history/view-all`,
                adminizer.policyManager.bindPolicies(policies, HistoryController.index)
            )
            adminizer.app.post(
                `${adminizer.config.routePrefix}/history/view-all`,
                adminizer.policyManager.bindPolicies(policies, HistoryController.index)
            )
            adminizer.app.post(
                `${adminizer.config.routePrefix}/history/get-model-history`,
                adminizer.policyManager.bindPolicies(policies, HistoryController.getAllModelHistory)
            );
            adminizer.app.post(
                `${adminizer.config.routePrefix}/history/get-model-fields`,
                adminizer.policyManager.bindPolicies(policies, HistoryController.getModelFieldsHistory)
            )
        }


        if (adminizer.config.aiAssistant?.enabled) {
            adminizer.app.get(
                `${adminizer.config.routePrefix}/api/ai-assistant/models`,
                adminizer.policyManager.bindPolicies(policies, AiAssistantController.getModels)
            );

            adminizer.app.get(
                `${adminizer.config.routePrefix}/api/ai-assistant/history/:modelId`,
                adminizer.policyManager.bindPolicies(policies, AiAssistantController.getHistory)
            );

            adminizer.app.post(
                `${adminizer.config.routePrefix}/api/ai-assistant/query`,
                adminizer.policyManager.bindPolicies(policies, AiAssistantController.sendMessage)
            );

            adminizer.app.delete(
                `${adminizer.config.routePrefix}/api/ai-assistant/history/:modelId`,
                adminizer.policyManager.bindPolicies(policies, AiAssistantController.resetHistory)
            );
        }

        /**
         * List of records
         */
        adminizer.app.all(baseRoute, adminizer.policyManager.bindPolicies(policies, _list));

        if (adminizer.config.filters?.enabled) {

            /**
             * Get filter fields for model
             */
            adminizer.app.get(`${baseRoute}/filter-fields`, adminizer.policyManager.bindPolicies(policies, _filterFields));

            /**
             * Saved filters
             */
            adminizer.app.get(`${baseRoute}/saved-filters`, adminizer.policyManager.bindPolicies(policies, getSavedFilters));
            adminizer.app.get(`${baseRoute}/filter/locales`, adminizer.policyManager.bindPolicies(policies, getFilterLocales));
            adminizer.app.get(`${baseRoute}/filter/temporary`, adminizer.policyManager.bindPolicies(policies, getTemporaryFilter));
            adminizer.app.post(`${baseRoute}/filter`, adminizer.policyManager.bindPolicies(policies, saveFilter));
            adminizer.app.post(`${baseRoute}/filter/apply`, adminizer.policyManager.bindPolicies(policies, applyTemporaryFilter));
            adminizer.app.delete(`${baseRoute}/filter/:id`, adminizer.policyManager.bindPolicies(policies, deleteFilter));

            /**
             * Get all groups (for admin filter visibility settings)
             */
            adminizer.app.get(`${adminizer.config.routePrefix}/groups`, getAllGroups);

            /**
             * Export data (JSON, CSV, XLSX)
             */
            adminizer.app.post(`${baseRoute}/export`, adminizer.policyManager.bindPolicies(policies, _exportData));

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
            adminizer.app.get(`${adminizer.config.routePrefix}/api/all-user-filters`, adminizer.policyManager.bindPolicies(policies, getAllUserFilters));
            adminizer.app.all(`${adminizer.config.routePrefix}/user-filters`, adminizer.policyManager.bindPolicies(policies, listUserFilters));
            /**
            * Get model columns (available columns for the model)
            */
            adminizer.app.get(`${baseRoute}/columns`, adminizer.policyManager.bindPolicies(policies, getModelColumns));

            /**
             * Update filter columns configuration
             */
            adminizer.app.post(`${baseRoute}/filter/:filterId/columns`, adminizer.policyManager.bindPolicies(policies, updateFilterColumns));
        }

        /**
         * User API Key management
         * GET /adminizer/api/user-key — returns current user's API key
         * POST /adminizer/api/user-key/regenerate — regenerates the API key
         */
        adminizer.app.get(`${adminizer.config.routePrefix}/api/user-key`, adminizer.policyManager.bindPolicies(policies, getUserApiKey));
        adminizer.app.post(`${adminizer.config.routePrefix}/api/user-key/regenerate`, adminizer.policyManager.bindPolicies(policies, regenerateUserApiKey));


        adminizer.app.get(`${adminizer.config.routePrefix}/get-timezones`, adminizer.policyManager.bindPolicies(policies, timezones))

        if (adminizer.config.models) {
            for (let model in adminizer.config.models) {
                await this.bindModelRoutes(model, policies);
            }
        }

        /**
         * Inline update field in list view
         */
        adminizer.app.patch(`${baseRoute}/inline/:id`, adminizer.policyManager.bindPolicies(policies, _inlineUpdate));

        /**
         * View record details
         */
        adminizer.app.all(baseRoute + "/view/:id", adminizer.policyManager.bindPolicies(policies, _view));

        /**
         * Remove record
         */
        adminizer.app.all(baseRoute + "/remove/:id", adminizer.policyManager.bindPolicies(policies, _remove));

        /**
         * Create a default dashboard
         */
        if (adminizer.config.dashboard) {
            adminizer.app.all(adminizer.config.routePrefix, adminizer.policyManager.bindPolicies(policies, _dashboard));
        } else {
            adminizer.app.all(adminizer.config.routePrefix, adminizer.policyManager.bindPolicies(policies, _welcome));
        }
        // TODO emit can be used in tests
        adminizer.emitter.emit("router:bound");
    }

    public unbindModelRoutes(model: string): void {
        if (!this.adminizer.app._router) return;
        const patterns = this.modelRoutePatterns.get(model);
        if (!patterns?.length) return;
        const removedPaths: string[] = [];
        this.adminizer.app._router.stack = this.adminizer.app._router.stack.filter((layer: any) => {
            if (layer.route && patterns.some((p: RegExp) => p.test(layer.route.path))) {
                removedPaths.push(layer.route.path);
                return false;
            }
            return true;
        });
        this.modelRoutePatterns.delete(model);
        Adminizer.log.debug(`Adminpanel removed routes for model \`${model}\`: ${removedPaths.join(', ')}`);
    }

    public async bindModelRoutes(model: string, policies?: MiddlewareType[]): Promise<void> {
        if (!policies) policies = this.adminizer.config.policies;
        if (this.modelRoutePatterns.has(model)) {
            this.unbindModelRoutes(model);
        }
        
        const modelConfig = this.adminizer.config.models[model];
        const prefix = `${this.adminizer.config.routePrefix}/model/${model}`;

        const registeredPaths: string[] = [];
        const register = (path: string, handler: any) => {
            this.adminizer.app.all(path, this.adminizer.policyManager.bindPolicies(policies!, handler));
            const patterns = this.modelRoutePatterns.get(model) ?? [];
            patterns.push(new RegExp(`^${path.replace(/:[^/]+/g, '[^/]+')}$`));
            this.modelRoutePatterns.set(model, patterns);
            registeredPaths.push(path);
        };

        if (typeof modelConfig === "boolean" && modelConfig === true) {
            Adminizer.log.debug(`Adminpanel create CRUD routes for \`${model}\` by boolean true`);
            register(`${prefix}/add`, _add);
            register(`${prefix}/edit/:id`, _edit);
            register(`${prefix}/remove/:id`, _remove);
        } else if (modelConfig !== undefined && typeof modelConfig !== "boolean") {
            Adminizer.log.debug(`Adminpanel create CRUD routes for \`${model}\` by ModelConfig`);

            /**
             * Create new record
             */
            const addHandler = modelConfig.add as CreateUpdateConfig;
            if (addHandler?.controller) {
                if (typeof addHandler.controller === 'string') {
                    let controller = await import(addHandler.controller);
                    register(`${prefix}/add`, controller.default);
                } else {
                    register(`${prefix}/add`, addHandler.controller as any);
                }
            } else {
                register(`${prefix}/add`, _add);
            }

            /**
             * Edit existing record
             */
            const editHandler = modelConfig.edit as CreateUpdateConfig;
            if (editHandler?.controller) {
                if (typeof editHandler.controller === 'string') {
                    let controller = await import(editHandler.controller);
                    register(`${prefix}/edit/:id`, controller.default);
                } else {
                    register(`${prefix}/edit/:id`, editHandler.controller as any);
                }
            } else {
                register(`${prefix}/edit/:id`, _edit);
            }
        } else {
            Adminizer.log.silly(`Adminpanel skip create CRUD routes for model: ${model}`);
        }

        if (registeredPaths.length > 0) {
            Adminizer.log.debug(`Adminpanel added routes for model \`${model}\`: ${registeredPaths.join(', ')}`);
        }
    }
}
