import { QueryCriteria } from "./queryCriteria";

export type InternalModelAccessScope = string;

export type InternalModelAccessMap = Record<InternalModelAccessScope, string[]>;

export type InternalModelRelationId = string | number;

export type InternalModelWriteFieldValue<TValue> =
    NonNullable<TValue> extends Array<infer Item>
        ? Item extends { id: unknown }
            ? TValue | InternalModelRelationId[]
            : TValue
        : NonNullable<TValue> extends { id: unknown }
            ? TValue | InternalModelRelationId
            : TValue;

export type InternalModelWriteData<T = any> = {
    [Field in keyof T]?: InternalModelWriteFieldValue<T[Field]>;
} & Record<string, any>;

export interface InternalModelRepository<T = any> {
    readonly name: string;
    find(criteria?: QueryCriteria<T>): Promise<T[]>;
    findOne(criteria?: QueryCriteria<T>): Promise<T | null>;
    count(criteria?: QueryCriteria<T>): Promise<number>;
    create(data: InternalModelWriteData<T>): Promise<T>;
    update(criteria: QueryCriteria<T>, data: InternalModelWriteData<T>): Promise<T[]>;
    updateOne(criteria: QueryCriteria<T>, data: InternalModelWriteData<T>): Promise<T | null>;
    destroy(criteria: QueryCriteria<T>): Promise<T[]>;
    destroyOne(criteria: QueryCriteria<T>): Promise<T | null>;
}
