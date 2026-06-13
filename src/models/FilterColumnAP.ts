import type {FilterAP} from "./FilterAP";

/**
 * FilterColumnAP interface for TypeScript
 */
export interface FilterColumnAP {
    id?: number;
    filter: string | FilterAP;       // BelongsTo FilterAP
    fieldName: string;
    order: number;
}
