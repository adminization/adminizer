import { IsAny, QueryCriteria } from "./queryCriteria";

export type InternalModelAccessScope = string;

export type InternalModelAccessMap = Record<InternalModelAccessScope, string[]>;

export type InternalModelRelationId = string | number;

export type InternalModelWriteFieldValue<TValue> =
    NonNullable<TValue> extends Array<infer Item>
        ? Item extends { id?: unknown }
            ? TValue | InternalModelRelationId[]
            : TValue
        : NonNullable<TValue> extends { id?: unknown }
            ? TValue | InternalModelRelationId
            : TValue;

type RequiredFieldKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type OptionalFieldKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type InternalModelCreateData<T = any> = IsAny<T> extends true
    ? Record<string, any>
    : {
        [K in RequiredFieldKeys<T>]: InternalModelWriteFieldValue<T[K]>;
    } & {
        [K in OptionalFieldKeys<T>]?: InternalModelWriteFieldValue<T[K]>;
    };

export type InternalModelUpdateData<T = any> = IsAny<T> extends true
    ? Record<string, any>
    : {
        [Field in keyof T]?: InternalModelWriteFieldValue<T[Field]>;
    };

/** @deprecated Use `InternalModelCreateData` for create or `InternalModelUpdateData` for update. */
export type InternalModelWriteData<T = any> = InternalModelUpdateData<T>;

export interface InternalModelRepository<T = any> {
    readonly name: string;
    find(criteria?: QueryCriteria<T>): Promise<T[]>;
    findOne(criteria?: QueryCriteria<T>): Promise<T | null>;
    count(criteria?: QueryCriteria<T>): Promise<number>;
    create(data: InternalModelCreateData<T>): Promise<T>;
    update(criteria: QueryCriteria<T>, data: InternalModelUpdateData<T>): Promise<T[]>;
    updateOne(criteria: QueryCriteria<T>, data: InternalModelUpdateData<T>): Promise<T | null>;
    destroy(criteria: QueryCriteria<T>): Promise<T[]>;
    destroyOne(criteria: QueryCriteria<T>): Promise<T | null>;
}
