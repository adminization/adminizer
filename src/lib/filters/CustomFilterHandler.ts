/**
 * Custom field condition result
 */
export interface FilterCustomFieldCondition {
    rawSQL?: string;
    params?: any[];
    inMemory?: (record: any) => boolean;
    criteria?: Record<string, any>;
}

export type FilterCustomFieldInputType = "text" | "number";

export interface FilterCustomFieldInputConfigItem {
    placeholder: string;
    type?: FilterCustomFieldInputType;
}

/**
 * Input config provided by a custom filter handler class.
 * Keys are input IDs; values describe placeholders and optional HTML input type.
 */
export type FilterCustomFieldInputConfig = Record<string, FilterCustomFieldInputConfigItem>;

export interface FilterCustomFieldInputDefinition {
    id: string;
    placeholder: string;
    type: FilterCustomFieldInputType;
}

/**
 * Base custom filter handler contract.
 * Stores model and field separately and builds a full handler ID as "Model.field".
 */
export abstract class AbstractCustomFilter {
    private readonly modelName: string;
    private readonly fieldName: string;

    protected constructor(modelName: string, fieldName: string) {
        if (!modelName?.trim()) {
            throw new Error("Custom filter handler requires non-empty model name.");
        }

        if (!fieldName?.trim()) {
            throw new Error("Custom filter handler requires non-empty field name.");
        }

        this.modelName = modelName;
        this.fieldName = fieldName;
    }

    public get id(): string {
        return `${this.modelName}.${this.fieldName}`;
    }

    /**
     * Handler name for display
     */
    public abstract readonly name: string;

    /**
     * Handler description
     */
    public readonly description?: string;

    /**
     * Optional input config for UI (up to 3 inputs).
     * Example:
     * {
     *   from: { placeholder: "From", type: "number" },
     *   to: { placeholder: "To", type: "number" }
     * }
     */
    public readonly inputConfig?: FilterCustomFieldInputConfig;

    /**
     * Build condition for the custom field
     * @param value - Filter value
     * @param params - Additional parameters for the handler
     */
    public abstract buildCondition(value: any, params?: any): FilterCustomFieldCondition;

    /**
     * Validate value before applying filter
     */
    public validate?(value: any): { valid: boolean; error?: string };

    public getInputDefinitions(): FilterCustomFieldInputDefinition[] {
        if (!this.inputConfig) {
            return [];
        }

        return Object.entries(this.inputConfig).map(([id, config]) => ({
            id,
            placeholder: config?.placeholder || id,
            type: config?.type === "number" ? "number" : "text",
        }));
    }
}

/**
 * Registry options
 */
export interface RegisterOptions {
    /**
     * Force overwrite existing handler
     */
    force?: boolean;
}

/**
 * CustomFilterHandler - registry for custom field handlers
 */
export class CustomFilterHandler {
    private handlers: Map<string, AbstractCustomFilter> = new Map();

    private validateInputConfig(handler: AbstractCustomFilter): void {
        const definitions = handler.getInputDefinitions();

        if (definitions.length > 3) {
            throw new Error(`Custom filter handler '${handler.id}' supports at most 3 inputs.`);
        }

        for (const definition of definitions) {
            if (!definition.id.trim()) {
                throw new Error(`Custom filter handler '${handler.id}' has an input with empty id.`);
            }
        }
    }

    /**
     * Register a custom handler
     * @param handler - Handler instance
     * @param options - Registration options
     */
    public add(
        handler: AbstractCustomFilter,
        options?: RegisterOptions
    ): void {
        this.validateInputConfig(handler);

        if (this.handlers.has(handler.id) && !options?.force) {
            throw new Error(`Handler '${handler.id}' is already registered. Use force: true to overwrite.`);
        }

        this.handlers.set(handler.id, handler);
    }

    /**
     * Alias for add()
     */
    public register(
        handler: AbstractCustomFilter,
        options?: RegisterOptions
    ): void {
        this.add(handler, options);
    }

    /**
     * Get handler by ID
     */
    public get(id: string): AbstractCustomFilter | undefined {
        return this.handlers.get(id);
    }

    /**
     * Check if handler exists
     */
    public has(id: string): boolean {
        return this.handlers.has(id);
    }

    /**
     * Get all handlers
     */
    public getAll(): Map<string, AbstractCustomFilter> {
        return new Map(this.handlers);
    }

    /**
     * Get handlers for a specific model
     * @param modelName - Model name (e.g., "Order")
     * @returns Map of field handlers for the model
     */
    public getForModel(modelName: string): Map<string, AbstractCustomFilter> {
        const modelHandlers = new Map<string, AbstractCustomFilter>();
        const prefix = `${modelName}.`;

        for (const [id, handler] of this.handlers.entries()) {
            if (id.startsWith(prefix)) {
                modelHandlers.set(id, handler);
            }
        }

        return modelHandlers;
    }

    /**
     * Unregister a handler
     */
    public unregister(id: string): boolean {
        return this.handlers.delete(id);
    }

    /**
     * Clear all handlers (useful for testing)
     */
    public clear(): void {
        this.handlers.clear();
    }

    /**
     * Get count of registered handlers
     */
    public count(): number {
        return this.handlers.size;
    }
}

export default CustomFilterHandler;

