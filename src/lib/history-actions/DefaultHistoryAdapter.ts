import { HistoryActions } from "../../models/HistoryActions";
import { User } from "../../models/User";
import { Adminizer } from "../Adminizer";
import { AbstractHistoryAdapter } from "./AbstractHistoryAdapter";

export class DefaultHistoryAdapter extends AbstractHistoryAdapter {
    public id: string = 'default';
    public model: string = 'HistoryActions';


    constructor(adminizer: Adminizer) {
        super(adminizer);

    }

    private historyModel() {
        return this.adminizer.modelHandler.internal("history").get<HistoryActions>(this.model);
    }

    private userModel() {
        return this.adminizer.modelHandler.internal("history").get<User>("User");
    }

    public async getAllHistory(
        user: User,
        forUserName: string,
        modelName: string,
        limit: number = 15,
        skip: number = 0,
        from?: Date,
        to?: Date
    ): Promise<{ data: HistoryActions[] }> {

        let userId = null;
        if (forUserName !== 'all') {
            const foundUser = await this.userModel().findOne({where: {login: forUserName}});
            if (!foundUser) {
                throw new Error("User not found");
            }
            userId = foundUser.id;
        }

        const query: any = modelName === 'all' && forUserName === 'all' ? {} :
            {
                ...(modelName !== 'all' ? { modelName } : {}),
                ...(forUserName !== 'all' ? { user: userId } : {})
            };

        if (from && to) {
            query.createdAt = {
                '>=': from,
                '<=': to.setHours(23, 59, 59, 999)
            };
        }

        let totalFetched = 0;
        let resultItems: HistoryActions[] = [];
        let currentSkip = skip;

        // Add more until you get the required amount
        while (resultItems.length < limit) {
            // We request with a reserve to reduce the number of requests to the database
            const fetchLimit = Math.min(limit * 2, 50);

            const history = await this.historyModel().find({
                where: query,
                sort: "createdAt DESC",
                limit: fetchLimit,
                skip: currentSkip
            });

            if (history.length === 0) {
                break; // No more data
            }

            const filteredHistory = await this._getAllHistory(history, user);

            // Add filtered records to the result
            for (const item of filteredHistory) {
                if (resultItems.length < limit) {
                    resultItems.push(item);
                }
            }

            totalFetched += history.length;
            currentSkip += history.length;

            // If you receive less than what you requested, it means the database has run out of data
            if (history.length < fetchLimit) {
                break;
            }
        }

        return {
            data: resultItems
        };
    }

    public async getAllModelHistory(modelId: string | number, modelName: string, user: User): Promise<HistoryActions[]> {
        try {
            const history = await this.historyModel().find({
                where: { modelName: modelName, modelId: String(modelId) },
                sort: "createdAt DESC"
            })
            return await this._getAllModelHistory(history, user)
        } catch (e) {
            Adminizer.log.error('Eror getting history', e)
            throw new Error("Eror getting history");
        }
    }

    public async getModelFieldsHistory(historyId: number, user: User): Promise<Record<string, any>> {
        const history = await this.historyModel().findOne({where: {id: historyId}})

        return await this._getModelFieldsHistory(history, user)
    }

    public async setHistory(data: Omit<HistoryActions, "createdAt" | "updatedAt" | "user"> & { user: string | number }): Promise<void> {
        try {
            await this.historyModel().update(
                {
                    where: {
                        modelId: String(data.modelId),
                        modelName: data.modelName,
                        isCurrent: true
                    }
                },
                { isCurrent: false }
            )
            await this.historyModel().create({
                ...data,
                modelId: String(data.modelId),
                isCurrent: true
            })
        } catch (e) {
            Adminizer.log.error('Eror saving history', e)
        }
    }

}
