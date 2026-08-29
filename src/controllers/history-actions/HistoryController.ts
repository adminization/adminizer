import { Adminizer } from "../../lib/Adminizer";
import { AbstractHistoryAdapter } from "../../lib/history-actions/AbstractHistoryAdapter";
import { User } from "../../models/User";
import { getUiTranslations } from "../../lib/ui-i18n/getUiTranslations";
import { HISTORY_UI_TRANSLATION_KEYS } from "../../lib/ui-i18n/uiTranslationKeys";

export class HistoryController {

    static async index(req: ReqType, res: ResType): Promise<any> {
        if (!await HistoryController.checkHistoryPermission(req, res)) return
        const adapter = HistoryController.getAdapter(req);

        if (req.method.toUpperCase() === 'GET') {
            const rawModels = await adapter.getModels(req.user);
            let users: User[] = []

            const accessToUsersHistory = await req.adminizer.accessRightsHelper.checkAnyPermission([
                `users-history-${adapter.id}`
            ], req.user);

            if (accessToUsersHistory) users = await req.adminizer.modelHandler.model.get('User')['_find']({}) as User[]

            // Getting an array of config.models keys in lowercase for comparison
            const normalizedModelConfig = new Map(
                Object.entries(req.adminizer.config.models || {}).map(([key, value]) => [
                    key.toLowerCase(),
                    value
                ])
            );

            // Converting models to { name, title } objects
            const models = rawModels.map(model => {
                const normalizedModelName = model.toLowerCase();
                const configModel = normalizedModelConfig.get(normalizedModelName);
                const title = req.i18n.__(configModel?.title) ?? model; // if there is no title, use the original name

                return {
                    name: model,
                    title
                };
            });

            const i18nPage = getUiTranslations(req, HISTORY_UI_TRANSLATION_KEYS);

            return req.Inertia.render({
                component: 'history',
                props: {
                    title: req.i18n.__('History'),
                    models,
                    users: users.map((user: User) => ({
                        name: user.login
                    })),
                    i18nPage
                }
            });
        }

        if (req.method.toUpperCase() === 'POST') {
            const { model, limit, user, from, to, offset: skip } = req.body

            try {
                return res.json({
                    ...await adapter.getAllHistory(
                        req.user,
                        user, model.toLowerCase(),
                        limit,
                        skip,
                        from ? new Date(from) : null,
                        to ? new Date(to) : null)
                })
            } catch (e) {
                Adminizer.logger.error(e)

                return res.status(500).json({
                    error: 'Failed to load history. Please try again later or contact support.'
                });
            }
        }

        return res.status(405).end()
    }


    static async getAllModelHistory(req: ReqType, res: ResType): Promise<any> {
        if (!await HistoryController.checkHistoryPermission(req, res)) return

        const { modelId, modelName } = req.body;

        if (!modelId || !modelName) {
            return res.status(400).json({
                error: 'Model ID and name are required'
            });
        }

        const adapter = HistoryController.getAdapter(req);
        try {
            const data = await adapter.getAllModelHistory(modelId, modelName, req.user);
            return res.json({ data });
        } catch (e) {
            Adminizer.logger.error(e)
            return res.status(500).json({
                error: 'Failed to load history. Please try again later or contact support.'
            });
        }
    }

    static async getModelFieldsHistory(req: ReqType, res: ResType): Promise<any> {
        if (!await HistoryController.checkHistoryPermission(req, res)) return

        const { historyId } = req.body;

        if (!historyId) {
            return res.status(400).json({
                error: 'History ID is required'
            })
        }
        const adapter = HistoryController.getAdapter(req);

        try {
            const data = await adapter.getModelFieldsHistory(+historyId, req.user)
            return res.json({ data })
        } catch (e) {
            return res.status(500).json({
                error: 'Failed to load history. Please try again later or contact support.'
            });
        }
    }


    static getAdapter(req: ReqType): AbstractHistoryAdapter {
        const adapter = req.adminizer.config.history?.adapter ?? 'default';
        return req.adminizer.historyHandler.get(adapter);
    }

    private static async checkHistoryPermission(req: ReqType, res: ResType): Promise<boolean> {
        if (!req.adminizer?.historyHandler) {
            res.status(401).json({ error: 'History system not initialized' });
            return false
        }

        const hasPermission = await req.adminizer.accessRightsHelper.checkPermission(
            `history-${req.adminizer.config.history?.adapter ?? 'default'}`,
            req.user
        );

        if (!hasPermission) {
            res.sendStatus(403);
            return false
        }
        return true
    }
}
