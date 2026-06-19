import type {User} from "./User"

export interface HistoryActions {
    id?: number,
    modelId: number | string,
    modelName: string,
    action: string,
    data: any,
    diff: any,
    user: User,
    isCurrent: boolean,
    createdAt?: number,
    updatedAt?: number,
    preview: boolean
}
