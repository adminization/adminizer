import type {Filter} from "./Filter";

/**
 * FilterColumn interface for TypeScript
 */
export interface FilterColumn {
    id?: number;
    filter: string | Filter;
    fieldName: string;
    order: number;
}
