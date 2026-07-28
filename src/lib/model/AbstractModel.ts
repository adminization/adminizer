import {DataAccessor} from "../DataAccessor";
import {formatChanges, sanitizeForDiff} from "../../helpers/diffHelpers";
import {diff} from "deep-object-diff";
import { HistoryActions } from "../../models/HistoryActions";
import { QueryCriteria } from "../../interfaces/queryCriteria";
import { InternalModelCreateData, InternalModelRepository, InternalModelUpdateData } from "../../interfaces/internalModelAccess";
import { INTERNAL_MODEL_ACCESS_TOKEN } from "./internalModelAccessToken";

export interface Attribute {
    /**
     * `date` covers every temporal column (date, time, timestamp). It is deliberately
     * separate from `string`: dates must not take part in LIKE search, and the UI
     * renders them with date controls.
     */
    type: 'association' | 'association-many' | 'number' | 'json' | 'string' | 'boolean' | 'date' | 'ref';
    required?: boolean;
    unique?: boolean;
    defaultsTo?: any;
    columnName?: string;
    model?: string;
    collection?: string;
    via?: string;
    allowNull?: boolean;
    /**
     * This is a field that indicates that it refers to keep the bond key 1: 1
     */
    primaryKeyForAssociation?: boolean;
}

export interface ModelAttributes {
    [key: string]: Attribute;
}

export type ModelAnyField = number | string | boolean | Date | Array<number | string | boolean> | {
    [key: string]: number | string | boolean | Date
};

export type ModelAnyInstance = {
    [key: string]: ModelAnyField
}

export abstract class AbstractModel<T> {
    public readonly modelname: string;
    public readonly attributes: ModelAttributes;
    public readonly primaryKey: string;
    public readonly identity: string;

    protected constructor(modelname: string, attributes: ModelAttributes, primaryKey: string, identity: string) {
        this.modelname = modelname;
        this.attributes = attributes;
        this.primaryKey = primaryKey;
        this.identity = identity;
    }

    protected abstract _create(data: Partial<T>): Promise<T>;

    protected abstract _findOne(criteria: QueryCriteria<T>): Promise<T | null>;

    protected abstract _find(criteria: QueryCriteria<T>): Promise<T[]>;

    protected abstract _updateOne(criteria: QueryCriteria<T>, data: Partial<T>): Promise<T | null>;

    protected abstract _update(criteria: QueryCriteria<T>, data: Partial<T>): Promise<T[]>;

    protected abstract _destroyOne(criteria: QueryCriteria<T>): Promise<T | null>;

    protected abstract _destroy(criteria: QueryCriteria<T>): Promise<T[]>;

    protected abstract _count(criteria: QueryCriteria<T>): Promise<number>;

    protected createInternalRepository(accessToken: symbol, modelName: string = this.modelname): InternalModelRepository<T> {
        if (accessToken !== INTERNAL_MODEL_ACCESS_TOKEN) {
            throw new Error("Internal model repository access denied");
        }

        const model = this;

        return {
            async find(criteria: QueryCriteria<T> = {}): Promise<T[]> {
                return model._find(criteria);
            },

            async findOne(criteria: QueryCriteria<T> = {}): Promise<T | null> {
                return model._findOne(criteria);
            },

            async count(criteria: QueryCriteria<T> = {}): Promise<number> {
                return model._count(criteria);
            },

            async create(data: InternalModelCreateData<T>): Promise<T> {
                return model._create(data as Partial<T>);
            },

            async update(criteria: QueryCriteria<T>, data: InternalModelUpdateData<T>): Promise<T[]> {
                return model._update(criteria, data as Partial<T>);
            },

            async updateOne(criteria: QueryCriteria<T>, data: InternalModelUpdateData<T>): Promise<T | null> {
                return model._updateOne(criteria, data as Partial<T>);
            },

            async destroy(criteria: QueryCriteria<T>): Promise<T[]> {
                return model._destroy(criteria);
            },

            async destroyOne(criteria: QueryCriteria<T>): Promise<T | null> {
                return model._destroyOne(criteria);
            },

            get name(): string {
                return modelName;
            }
        };
    }

    /**
     * Generate diff between old and new records
     */
    private generateDiff(oldRecord: any, newRecord: any): {
        changesDiff: any,
        formattedChanges: any[],
        cleanOldRecord: any,
        cleanNewRecord: any
    } {
        const cleanOldRecord = sanitizeForDiff(oldRecord);
        const cleanNewRecord = sanitizeForDiff(newRecord);
        const changesDiff = diff(cleanOldRecord, cleanNewRecord);
        const formattedChanges = formatChanges(changesDiff, cleanOldRecord, cleanNewRecord);

        return {
            changesDiff,
            formattedChanges,
            cleanOldRecord,
            cleanNewRecord
        };
    }

    /**
     * Generate delete diff (record vs empty object)
     */
    private generateDeleteDiff(record: any): {
        changesDiff: any,
        formattedChanges: any[],
        cleanRecord: any
    } {
        const cleanRecord = sanitizeForDiff(record);
        const changesDiff = diff(cleanRecord, {});
        const formattedChanges = formatChanges(changesDiff, cleanRecord, {});

        return {
            changesDiff,
            formattedChanges,
            cleanRecord
        };
    }

    private async setHistory(dataAccessor: DataAccessor, data: Omit<HistoryActions, "id" | "createdAt" | "updatedAt" | "isCurrent" | "user"> & {user: string | number}){
        if(!dataAccessor.adminizer.config.history?.enabled) return;

        const adapter = dataAccessor.adminizer.config.history?.adapter ?? 'default';
        const historyAdapter = dataAccessor.adminizer.historyHandler.get(adapter);
        await historyAdapter.setHistory(data)
    }

    /**
     * Log system event with diff
     */
    private async logSystemEvent(
        dataAccessor: DataAccessor,
        eventType: 'Created' | 'Updated' | 'Deleted',
        userId: string | number,
        oldRecord: Partial<T>,
        newRecord: Partial<T>
    ): Promise<void> {
        if(!dataAccessor.adminizer.config.history?.enabled) return;

        let formattedChanges: any[] = [];
        let summary = '';
        
        switch (eventType) {
            case 'Created':
                const cleanNewRecord = sanitizeForDiff(newRecord);
                formattedChanges = formatChanges({}, {}, cleanNewRecord, 'add');
                summary = `Created ${formattedChanges.length} fields`;
                break;

            case 'Updated':
                const {formattedChanges: updateChanges} = this.generateDiff(oldRecord, newRecord);
                formattedChanges = updateChanges;
                summary = `Changes ${formattedChanges.length} fields`;
                break;

            case 'Deleted':
                const {formattedChanges: deleteChanges} = this.generateDeleteDiff(oldRecord);
                formattedChanges = deleteChanges;
                summary = `Deleted ${formattedChanges.length} fields`;
                break;
        }
        
        const record = eventType === 'Deleted' ? oldRecord : newRecord;

        this.setHistory(dataAccessor, {
            modelId: record[this.primaryKey as keyof T] as string | number,
            modelName: dataAccessor.modelResource.name.toLocaleLowerCase(),
            action: eventType.toLocaleLowerCase(),
            data: record,
            diff: formattedChanges,
            user: userId,
            preview: false
        })
        
    }

    public async create(data: T, dataAccessor: DataAccessor): Promise<Partial<T>> {
        let _data = await dataAccessor.setUserRelationAccess(dataAccessor.process(data));
        let record = await this._create(_data);
    
        // Log creation event
        await this.logSystemEvent(
            dataAccessor,
            'Created',
            dataAccessor.user.id,
            {},
            record
        );

        return dataAccessor.process(record);
    }

    public async findOne(criteria: QueryCriteria<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        let record = await this._findOne(criteria);

        return record ? dataAccessor.process(record, criteria) : null;
    }

    public async find(criteria: QueryCriteria<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        let records = await this._find(criteria);
        return records.map(record => dataAccessor.process(record, criteria));
    }

    /**
     * Find with raw SQL where clause (Sequelize.literal support)
     * Only available in Sequelize adapter
     */
    async findWithRawWhere(
        where: any,
        options?: { limit?: number; offset?: number; order?: any; populate?: boolean }
    ): Promise<any[]> {
        // Default implementation - will be overridden by Sequelize adapter
        throw new Error('findWithRawWhere is only supported in Sequelize adapter');
    }

    /**
     * Count with raw SQL where clause (Sequelize.literal support)
     * Only available in Sequelize adapter
     */
    async countWithRawWhere(where: any): Promise<number> {
        // Default implementation - will be overridden by Sequelize adapter
        throw new Error('countWithRawWhere is only supported in Sequelize adapter');
    }

    public async updateOne(criteria: QueryCriteria<T>, data: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
        let _data = dataAccessor.process(data);

        // Get the old record first for diff
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        const oldRecord = await this._findOne(criteria);

        if (!oldRecord) {
            return null;
        }

        let record = await this._updateOne(criteria, _data);

        if (!record) {
            return null;
        }

        // Log update event
        await this.logSystemEvent(
            dataAccessor,
            'Updated',
            dataAccessor.user.id,
            oldRecord,
            record
        );

        return dataAccessor.process(record, criteria);
    }

    public async update(criteria: QueryCriteria<T>, data: Partial<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
        let _data = dataAccessor.process(data);
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);

        // Get old records automatically
        const oldRecords = await this._find(criteria);
        let records = await this._update(criteria, _data);

        // Log update events for each record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const oldRecord = oldRecords[i];

            if (oldRecord) {
                await this.logSystemEvent(
                    dataAccessor,
                    'Updated',
                    dataAccessor.user.id,
                    oldRecord,
                    record
                );
            }
        }

        return records.map(record => dataAccessor.process(record, criteria));
    }

    public async destroyOne(criteria: QueryCriteria<T>, dataAccessor: DataAccessor): Promise<Partial<T> | null> {
        // Get the record first for diff
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        const oldRecord = await this._findOne(criteria);

        if (!oldRecord) {
            return null;
        }

        let record = await this._destroyOne(criteria);

        if (!record) {
            return null;
        }

        // Log delete event
        await this.logSystemEvent(
            dataAccessor,
            'Deleted',
            dataAccessor.user.id,
            oldRecord,
            {}
        );

        return dataAccessor.process(record, criteria);
    }

    public async destroy(criteria: QueryCriteria<T>, dataAccessor: DataAccessor): Promise<Partial<T>[]> {
        // Get records first for diff
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        const oldRecords = await this._find(criteria);

        let records = await this._destroy(criteria);

        // Log delete events for each record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const oldRecord = oldRecords[i];

            if (oldRecord) {
                await this.logSystemEvent(
                    dataAccessor,
                    'Deleted',
                    dataAccessor.user.id,
                    oldRecord,
                    {}
                );
            }
        }

        return records.map(record => dataAccessor.process(record, criteria));
    }

    public async count(criteria: QueryCriteria<T> = {}, dataAccessor: DataAccessor): Promise<number> {
        criteria = await dataAccessor.sanitizeUserRelationAccess(criteria);
        return this._count(criteria);
    }
}

export abstract class AbstractAdapter {
    public abstract Model: any;

    public readonly orm: any;
    public readonly ormType: string;
    public readonly systemModels: SystemModelBindings;

    protected constructor(type: string, orm: any, options: AbstractAdapterOptions = {}) {
        this.ormType = type;
        this.orm = orm;
        this.systemModels = options.systemModels ?? {};
    }

    abstract get models(): Record<string, any>

    /** This function should return constant type from any adapter (for adminizer proper work) */
    abstract getAttributes(modelName: string): ModelAttributes | undefined;

    /** Return full model object */
    abstract getModel(modelName: string): any;

}

export type SystemModelBindingValue = string | {
    model: string;
};

export type SystemModelBindings = Record<string, SystemModelBindingValue>;

export interface AbstractAdapterOptions {
    systemModels?: SystemModelBindings;
}


