import { UserAP } from "./UserAP";
import { FilterColumnAP } from "./FilterColumnAP";

/**
 * Filter operators for query conditions
 */
export type FilterOperator =
    | 'eq'           // =
    | 'neq'          // !=
    | 'gt'           // >
    | 'gte'          // >=
    | 'lt'           // <
    | 'lte'          // <=
    | 'like'         // LIKE %value%
    | 'ilike'        // ILIKE %value% (case-insensitive)
    | 'startsWith'   // LIKE value%
    | 'endsWith'     // LIKE %value
    | 'in'           // IN (array)
    | 'notIn'        // NOT IN
    | 'between'      // BETWEEN
    | 'today'        // Current day
    | 'month'        // Specific/current month
    | 'year'         // Specific/current year
    | 'monthBetween' // Month range
    | 'yearBetween'  // Year range
    | 'isNull'       // IS NULL
    | 'isNotNull'    // IS NOT NULL
    | 'regex'        // Regular expression
    | 'custom';      // Custom handler

/**
 * Single filter condition or condition group
 */
export interface FilterCondition {
    id: string;                      // UUID
    field?: string;
    operator?: FilterOperator;
    value?: any;

    // Nested conditions (for groups)
    logic?: 'AND' | 'OR' | 'NOT';
    children?: FilterCondition[];

    // For relations
    relation?: string;
    relationField?: string;

    // Custom handler (for complex fields like JSON)
    customHandler?: string;          // Custom handler ID
    customHandlerName?: string;      // Optional UI/display label
    customHandlerParams?: any;       // Optional custom handler runtime params

    // Optional advanced path used by query/validator internals
    rawSQL?: string;                 // Raw SQL condition
    rawSQLParams?: any[];            // SQL parameters
}

/**
 * Filter visibility types
 */
export type FilterVisibility = 'private' | 'public' | 'groups' | 'system';

/**
 * Filter model schema for Waterline/Sequelize
 */
export default {
    id: {
        type: "string",
        primaryKey: true
        // UUID will be generated before create
    },
    name: {
        type: "string",
        required: true
    },
    description: {
        type: "string"
    },
    modelName: {
        type: "string",
        required: true
    },
    conditions: {
        type: "json"
    },
    sortField: {
        type: "string"
    },
    sortDirection: {
        type: "string"
        // 'ASC' or 'DESC'
    },
    visibility: {
        type: "string"
        // 'private' | 'public' | 'groups' | 'system'
    },
    ownerId: {
        type: "number"
    },
    groupIds: {
        type: "json"
    },
    apiEnabled: {
        type: "boolean"
    },
    apiKey: {
        type: "string"
    },
    icon: {
        type: "string"
    },
    color: {
        type: "string"
    },
    version: {
        type: "number"
    },
    columns: {
        collection: "FilterColumnAP",
        via: "filter"
    },
    createdAt: {
        type: 'datetime',
        autoCreatedAt: true
    },
    updatedAt: {
        type: 'datetime',
        autoUpdatedAt: true
    }
}

/**
 * FilterAP interface for TypeScript
 */
export interface FilterAP {
    id: string;                      // UUID

    // Core data
    name: string;                    // Filter name
    description?: string;            // Description
    modelName: string;               // Target model name

    // Filter conditions (JSON)
    conditions: FilterCondition[];

    // Display settings
    sortField?: string;
    sortDirection?: 'ASC' | 'DESC';

    // Access rights
    visibility: FilterVisibility;
    ownerId: number;                 // Owner user ID
    groupIds?: number[];

    // API access
    apiEnabled: boolean;
    apiKey?: string;

    // UI settings
    icon?: string;
    color?: string;

    // Versioning
    version: number;                 // Filter format version (starts at 1)

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    // Relations
    columns?: FilterColumnAP[];
}
