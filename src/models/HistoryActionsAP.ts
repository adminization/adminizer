import type {UserAP} from "./UserAP"

export interface HistoryActionsAP {
    id?: number,
    modelId: number | string,
    modelName: string,
    action: string,
    data: any,
    diff: any,
    user: UserAP,
    isCurrent: boolean,
    createdAt?: number,
    updatedAt?: number,
    preview: boolean
}
