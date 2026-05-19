import { InternalModelRepository } from "../../interfaces/internalModelAccess";
import { AbstractModel } from "./AbstractModel";
import { INTERNAL_MODEL_ACCESS_TOKEN } from "./internalModelAccessToken";

export function createInternalModelRepository<T>(
    modelName: string,
    model: AbstractModel<T>
): InternalModelRepository<T> {
    return (model as any).createInternalRepository(INTERNAL_MODEL_ACCESS_TOKEN, modelName);
}
