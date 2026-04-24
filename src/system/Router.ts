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

    static onlyOnce: boolean = false;

    /**
     * The idea is that all methods within the first 3 seconds after start call this method, and as soon as all have been loaded, the loading will be blocked
     */
    static async bind(adminizer: Adminizer): Promise<void> {

        if (this.onlyOnce) {
            Adminizer.log.error(`This method allowed for run only one time`);
            return;
        }


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
                const modelConfig = adminizer.config.models[model];
                /**
                 * Add support only routes created for boolean true
                 */
                if (typeof modelConfig === "boolean" && modelConfig === true) {
                    Adminizer.log.debug(`Adminpanel create CRUD routes for \`${model}\` by boolean true`)
                    adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/add`, adminizer.policyManager.bindPolicies(policies, _add));
                    adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/edit/:id`, adminizer.policyManager.bindPolicies(policies, _edit));
                    adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/remove/:id`, adminizer.policyManager.bindPolicies(policies, _remove));
                } else if (typeof modelConfig !== "boolean") {
                    Adminizer.log.debug(`Adminpanel create CRUD routes for \`${model}\` by ModelConfig`)

                    /**
                     * Create new record
                     */
                    if (modelConfig.add) {
                        let addHandler = modelConfig.add as CreateUpdateConfig;
                        if (addHandler.controller) {
                            if (typeof addHandler.controller === 'string') {
                                // Dynamic import for string paths
                                let controller = await import(addHandler.controller);
                                adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/add`, adminizer.policyManager.bindPolicies(policies, controller.default));
                            } else {
                                // Direct function reference (controller function matches middleware signature)
                                adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/add`, adminizer.policyManager.bindPolicies(policies, addHandler.controller as any));
                            }
                        } else {
                            adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/add`, adminizer.policyManager.bindPolicies(policies, _add));
                        }
                    } else {
                        adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/add`, adminizer.policyManager.bindPolicies(policies, _add));
                    }
                    /**
                     * Edit existing record
                     */
                    if (modelConfig.edit) {
                        let editHandler = modelConfig.edit as CreateUpdateConfig;
                        if (editHandler.controller) {
                            if (typeof editHandler.controller === 'string') {
                                // Dynamic import for string paths
                                let controller = await import(editHandler.controller);
                                adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/edit/:id`, adminizer.policyManager.bindPolicies(policies, controller.default));
                            } else {
                                // Direct function reference (controller function matches middleware signature)
                                adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/edit/:id`, adminizer.policyManager.bindPolicies(policies, editHandler.controller as any));
                            }
                        } else {
                            adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/edit/:id`, adminizer.policyManager.bindPolicies(policies, _edit));
                        }
                    } else {
                        adminizer.app.all(`${adminizer.config.routePrefix}/model/${model}/edit/:id`, adminizer.policyManager.bindPolicies(policies, _edit));
                    }
                } else {
                    Adminizer.log.silly(`Adminpanel skip create CRUD routes for model: ${model}`)
                }
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
}
