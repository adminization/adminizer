import { FilterAP, FilterCondition, FilterOperator } from '../../models/FilterAP';
import { ConditionValidator, ValidationResult } from './ConditionValidator';

/**
 * Current filter schema version
 * Increment this when making breaking changes to filter format
 */
export const CURRENT_FILTER_VERSION = 1;

/**
 * Migration function type
 */
type MigrationFn = (filter: FilterAP) => FilterAP;

/**
 * Migration result
 */
export interface MigrationResult {
    filter: FilterAP;
    migrated: boolean;
    fromVersion: number;
    toVersion: number;
    changes: MigrationChange[];
    warnings: string[];
}

/**
 * Single migration change record
 */
export interface MigrationChange {
    type: 'operator_renamed' | 'condition_modified' | 'field_renamed' | 'condition_removed' | 'structure_changed';
    conditionId?: string;
    description: string;
    oldValue?: any;
    newValue?: any;
}

/**
 * Deprecated operators mapping (old -> new)
 */
const DEPRECATED_OPERATORS: Record<string, FilterOperator> = {
    // Examples for future migrations:
    // 'contains': 'like',
    // 'notContains': 'notLike',
    // 'equals': 'eq',
    // 'notEquals': 'neq',
    // 'greaterThan': 'gt',
    // 'lessThan': 'lt',
};

/**
 * Valid operators (current version)
 */
const VALID_OPERATORS: FilterOperator[] = [
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'startsWith', 'endsWith',
    'in', 'notIn', 'between', 'today', 'month', 'year', 'monthBetween', 'yearBetween',
    'isNull', 'isNotNull', 'regex', 'custom'
];

/**
 * FilterMigrator - handles filter validation and migration
 *
 * Responsibilities:
 * - Validate filter conditions on load
 * - Migrate deprecated operators to new ones
 * - Track schema version changes
 * - Provide warnings for incompatible filters
 */
export class FilterMigrator {
    /**
     * Migration functions by version
     * Key is the version to migrate FROM (to FROM+1)
     */
    private static migrations: Record<number, MigrationFn> = {
        // Add migrations here as schema evolves
        // Example:
        // 0: (filter) => { ... migrate from v0 to v1 ... return filter; }
    };

    /**
     * Validate and optionally migrate a filter
     *
     * @param filter - Filter to validate/migrate
     * @param fieldsConfig - Fields configuration for the target model
     * @param options - Options for validation/migration
     * @returns MigrationResult with the (possibly migrated) filter
     */
    static validateAndMigrate(
        filter: FilterAP,
        fieldsConfig?: Record<string, any>,
        options: {
            autoMigrate?: boolean;
            strictValidation?: boolean;
            allowedFields?: string[];
        } = {}
    ): MigrationResult & { validation: ValidationResult } {
        const { autoMigrate = true, strictValidation = false, allowedFields } = options;

        const changes: MigrationChange[] = [];
        const warnings: string[] = [];
        const fromVersion = filter.version || 0;
        let currentFilter = { ...filter };

        // Step 1: Migrate deprecated operators (always do this)
        currentFilter = this.migrateDeprecatedOperators(currentFilter, changes);

        // Step 2: Apply version migrations if needed
        if (autoMigrate && fromVersion < CURRENT_FILTER_VERSION) {
            currentFilter = this.applyMigrations(currentFilter, fromVersion, changes, warnings);
        }

        // Step 3: Update version
        currentFilter.version = CURRENT_FILTER_VERSION;

        // Step 4: Validate conditions
        let validation: ValidationResult = { valid: true, errors: [] };

        if (fieldsConfig && currentFilter.conditions) {
            const validator = new ConditionValidator(
                this.normalizeFieldsConfig(fieldsConfig),
                allowedFields
            );
            validation = validator.validate(currentFilter.conditions);

            // If strict validation, check for unknown fields as errors
            // If not strict, convert to warnings
            if (!strictValidation) {
                const unknownFieldErrors = validation.errors.filter(
                    e => e.code === 'UNKNOWN_FIELD'
                );
                for (const error of unknownFieldErrors) {
                    warnings.push(`Unknown field '${error.field}' in condition ${error.conditionId}: ${error.message}`);
                }
                // Remove unknown field errors from error list (convert to warnings)
                validation.errors = validation.errors.filter(
                    e => e.code !== 'UNKNOWN_FIELD'
                );
                validation.valid = validation.errors.length === 0;
            }
        }

        // Step 5: Check for removed fields (warn but don't fail)
        this.checkRemovedFields(currentFilter, fieldsConfig, warnings);

        return {
            filter: currentFilter,
            migrated: changes.length > 0,
            fromVersion,
            toVersion: CURRENT_FILTER_VERSION,
            changes,
            warnings,
            validation
        };
    }

    /**
     * Migrate deprecated operators in conditions
     */
    private static migrateDeprecatedOperators(
        filter: FilterAP,
        changes: MigrationChange[]
    ): FilterAP {
        if (!filter.conditions || filter.conditions.length === 0) {
            return filter;
        }

        const migratedConditions = this.migrateConditionsOperators(
            filter.conditions,
            changes
        );

        return {
            ...filter,
            conditions: migratedConditions
        };
    }

    /**
     * Recursively migrate operators in conditions
     */
    private static migrateConditionsOperators(
        conditions: FilterCondition[],
        changes: MigrationChange[]
    ): FilterCondition[] {
        return conditions.map(condition => {
            let migratedCondition = { ...condition };

            // Handle nested conditions
            if (condition.children && condition.children.length > 0) {
                migratedCondition.children = this.migrateConditionsOperators(
                    condition.children,
                    changes
                );
            }

            // Migrate deprecated operator
            if (condition.operator) {
                const oldOperator = condition.operator as string;
                const newOperator = DEPRECATED_OPERATORS[oldOperator];

                if (newOperator) {
                    migratedCondition.operator = newOperator;
                    changes.push({
                        type: 'operator_renamed',
                        conditionId: condition.id,
                        description: `Operator '${oldOperator}' migrated to '${newOperator}'`,
                        oldValue: oldOperator,
                        newValue: newOperator
                    });
                }

                // Check for invalid operators
                if (!newOperator && !VALID_OPERATORS.includes(oldOperator as FilterOperator)) {
                    // Leave as-is but record a change for reporting
                    changes.push({
                        type: 'condition_modified',
                        conditionId: condition.id,
                        description: `Unknown operator '${oldOperator}' found`,
                        oldValue: oldOperator
                    });
                }
            }

            return migratedCondition;
        });
    }

    /**
     * Apply sequential migrations from one version to another
     */
    private static applyMigrations(
        filter: FilterAP,
        fromVersion: number,
        changes: MigrationChange[],
        warnings: string[]
    ): FilterAP {
        let currentFilter = filter;

        for (let version = fromVersion; version < CURRENT_FILTER_VERSION; version++) {
            const migrateFn = this.migrations[version];

            if (migrateFn) {
                try {
                    currentFilter = migrateFn(currentFilter);
                    changes.push({
                        type: 'structure_changed',
                        description: `Migrated from version ${version} to ${version + 1}`
                    });
                } catch (error: any) {
                    warnings.push(
                        `Migration from v${version} to v${version + 1} failed: ${error?.message || error}`
                    );
                }
            } else {
                // No migration needed for this version jump
                // This is normal for minor version bumps
            }
        }

        return currentFilter;
    }

    /**
     * Check for fields that no longer exist in the model
     */
    private static checkRemovedFields(
        filter: FilterAP,
        fieldsConfig: Record<string, any> | undefined,
        warnings: string[]
    ): void {
        if (!fieldsConfig || !filter.conditions) {
            return;
        }

        const fieldNames = Object.keys(fieldsConfig);
        const conditionFields = this.extractFieldNames(filter.conditions);

        for (const field of conditionFields) {
            if (!fieldNames.includes(field)) {
                warnings.push(
                    `Field '${field}' used in filter conditions no longer exists in model '${filter.modelName}'`
                );
            }
        }
    }

    /**
     * Extract all field names from conditions (recursive)
     */
    private static extractFieldNames(conditions: FilterCondition[]): string[] {
        const fields: string[] = [];

        for (const condition of conditions) {
            if (condition.field) {
                fields.push(condition.field);
            }

            if (condition.children && condition.children.length > 0) {
                fields.push(...this.extractFieldNames(condition.children));
            }
        }

        return [...new Set(fields)]; // Deduplicate
    }

    /**
     * Normalize fields config to ConditionValidator format
     */
    private static normalizeFieldsConfig(
        fieldsConfig: Record<string, any>
    ): Record<string, { type: string; required?: boolean; maxLength?: number }> {
        const result: Record<string, { type: string; required?: boolean; maxLength?: number }> = {};

        for (const [fieldName, config] of Object.entries(fieldsConfig)) {
            if (typeof config === 'object' && config !== null) {
                result[fieldName] = {
                    type: config.type || 'string',
                    required: config.required,
                    maxLength: config.maxLength
                };
            } else {
                // Simple field definition (just type string)
                result[fieldName] = { type: 'string' };
            }
        }

        return result;
    }

    /**
     * Quick validation without migration
     */
    static validateOnly(
        filter: FilterAP,
        fieldsConfig: Record<string, any>,
        allowedFields?: string[]
    ): ValidationResult {
        if (!filter.conditions || filter.conditions.length === 0) {
            return { valid: true, errors: [] };
        }

        const validator = new ConditionValidator(
            this.normalizeFieldsConfig(fieldsConfig),
            allowedFields
        );

        return validator.validate(filter.conditions);
    }

    /**
     * Check if filter needs migration
     */
    static needsMigration(filter: FilterAP): boolean {
        const version = filter.version || 0;

        // Check version
        if (version < CURRENT_FILTER_VERSION) {
            return true;
        }

        // Check for deprecated operators
        if (filter.conditions) {
            return this.hasDeprecatedOperators(filter.conditions);
        }

        return false;
    }

    /**
     * Check if conditions contain deprecated operators
     */
    private static hasDeprecatedOperators(conditions: FilterCondition[]): boolean {
        for (const condition of conditions) {
            if (condition.operator) {
                const operatorStr = condition.operator as string;
                if (DEPRECATED_OPERATORS[operatorStr]) {
                    return true;
                }
            }

            if (condition.children && condition.children.length > 0) {
                if (this.hasDeprecatedOperators(condition.children)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get list of deprecated operators
     */
    static getDeprecatedOperators(): Record<string, FilterOperator> {
        return { ...DEPRECATED_OPERATORS };
    }

    /**
     * Get current filter version
     */
    static getCurrentVersion(): number {
        return CURRENT_FILTER_VERSION;
    }

    /**
     * Register a custom migration function
     * Useful for extending the migrator in user code
     */
    static registerMigration(fromVersion: number, migrateFn: MigrationFn): void {
        this.migrations[fromVersion] = migrateFn;
    }

    /**
     * Create a sanitized copy of filter conditions
     * Removes invalid or dangerous conditions
     */
    static sanitizeConditions(
        conditions: FilterCondition[],
        fieldsConfig: Record<string, any>,
        options: {
            removeInvalid?: boolean;
            removeRawSQL?: boolean;
        } = {}
    ): { conditions: FilterCondition[]; removed: string[] } {
        const { removeInvalid = false, removeRawSQL = false } = options;
        const removed: string[] = [];
        const fieldNames = Object.keys(fieldsConfig);

        const sanitize = (conds: FilterCondition[]): FilterCondition[] => {
            const result: FilterCondition[] = [];

            for (const condition of conds) {
                // Skip rawSQL if requested
                if (removeRawSQL && condition.rawSQL) {
                    removed.push(`Condition ${condition.id}: rawSQL removed`);
                    continue;
                }

                // Check if field exists
                if (removeInvalid && condition.field && !fieldNames.includes(condition.field)) {
                    removed.push(`Condition ${condition.id}: field '${condition.field}' not found`);
                    continue;
                }

                // Check if operator is valid
                if (removeInvalid && condition.operator) {
                    if (!VALID_OPERATORS.includes(condition.operator) &&
                        !DEPRECATED_OPERATORS[condition.operator as string]) {
                        removed.push(`Condition ${condition.id}: invalid operator '${condition.operator}'`);
                        continue;
                    }
                }

                // Recursively sanitize children
                let sanitizedCondition = { ...condition };
                if (condition.children && condition.children.length > 0) {
                    sanitizedCondition.children = sanitize(condition.children);
                }

                result.push(sanitizedCondition);
            }

            return result;
        };

        return {
            conditions: sanitize(conditions),
            removed
        };
    }
}

export default FilterMigrator;
