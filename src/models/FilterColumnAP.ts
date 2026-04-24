import { FilterAP } from "./FilterAP";

/**
 * FilterColumnAP model schema for Waterline/Sequelize
 * Represents column configuration for a filter
 */
export default {
    id: {
        type: "number",
        autoIncrement: true,
        primaryKey: true
    },
    filter: {
        model: 'FilterAP'
    },
    fieldName: {
        type: "string",
        required: true
    },
    order: {
        type: "number"
    }
}

/**
 * FilterColumnAP interface for TypeScript
 */
export interface FilterColumnAP {
    id: number;
    filter: string | FilterAP;       // BelongsTo FilterAP
    fieldName: string;
    order: number;
}
