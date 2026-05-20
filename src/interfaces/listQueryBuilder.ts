import { FilterCondition } from "../models/FilterAP";

/**
 * Input format for list/feed/export query builder.
 * This is not the internal model query language.
 */
export interface ListQueryBuilderParams {
    page: number;
    limit: number;
    sort?: string;
    sortDirection?: "ASC" | "DESC";
    filters?: FilterCondition[];
    globalSearch?: string;
    fields?: string[];
}

export interface ListQueryBuilderResult<T = any> {
    data: T[];
    total: number;
    filtered: number;
    page: number;
    limit: number;
    pages: number;
}
