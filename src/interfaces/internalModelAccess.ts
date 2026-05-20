import { QueryCriteria } from "./queryCriteria";

export type InternalModelAccessScope = string;

export type InternalModelAccessMap = Record<InternalModelAccessScope, string[]>;

export type InternalModelWriteData = Record<string, any>;

export interface InternalModelRepository<T = any> {
    readonly name: string;
    find(criteria?: QueryCriteria): Promise<T[]>;
    findOne(criteria?: QueryCriteria): Promise<T | null>;
    count(criteria?: QueryCriteria): Promise<number>;
    create(data: InternalModelWriteData): Promise<T>;
    update(criteria: QueryCriteria, data: InternalModelWriteData): Promise<T[]>;
    updateOne(criteria: QueryCriteria, data: InternalModelWriteData): Promise<T | null>;
    destroy(criteria: QueryCriteria): Promise<T[]>;
    destroyOne(criteria: QueryCriteria): Promise<T | null>;
}
