import {ControllerHelper} from "../../helpers/controllerHelper";
import {DataAccessor} from "../../lib/DataAccessor";
import {Field} from "../../helpers/fieldsHelper";

interface FilterField {
    id: string;
    label: string;
    type: string;
    options?: { value: string | number; label: string }[];
    relationFields?: Array<{
        id: string;
        label: string;
        type: string;
        options?: { value: string | number; label: string }[];
    }>;
    isRelation?: boolean;
    isCustomFilter?: boolean;
    customFilterHandlerId?: string;
    customFilterConditionLabel?: string;
    customFilterInputConfig?: Record<string, { placeholder: string; type?: "text" | "number" }>;
    required?: boolean;
}

function getFieldType(field: Field): string {
    const cfg = typeof field.config === 'object' && field.config !== null ? field.config as any : null;
    return (cfg?.type || field.model?.type || 'string') as string;
}

function getFieldLabel(req: ReqType, fieldName: string, field: Field): string {
    const cfg = typeof field.config === 'object' && field.config !== null ? field.config as any : null;
    return req.i18n.__(cfg?.title || fieldName) || fieldName;
}

function getFieldOptions(req: ReqType, field: Field): { value: string | number; label: string }[] | undefined {
    const cfg = typeof field.config === 'object' && field.config !== null ? field.config as any : null;
    const type = (cfg?.type || field.model?.type) as string | undefined;
    const isIn = cfg?.isIn;

    if ((type !== 'select' && type !== 'select-many') || !isIn) {
        return undefined;
    }

    if (Array.isArray(isIn)) {
        return isIn.map((val: string | number) => ({ value: val, label: String(val) }));
    }

    if (typeof isIn === 'object') {
        return Object.entries(isIn).map(([value, label]) => ({
            value,
            label: req.i18n.__(String(label)) || String(label),
        }));
    }

    return undefined;
}

function isSimpleFilterField(type: string): boolean {
    return ![
        'association',
        'association-many',
        'json',
        'jsoneditor',
        'object',
        'array',
    ].includes(type);
}

/**
 * Get filter fields for ANY model
 *
 * Takes fields from DataAccessor (merged config + access rights)
 * Excludes: system fields, complex JSON fields, model-level filters.excludeFromFilters
 * For Sequelize, includes simple relation filters (association/association-many + simple related fields)
 *
 * This controller is universal - works with any model
 */
export default async function filterFields(req: ReqType, res: ResType) {
    const entity = ControllerHelper.findEntityObject(req);

    if (!entity.model) {
        return res.status(404).send({ error: req.i18n.__('Model not found') });
    }

    // Get fields via DataAccessor (respects access rights and merged field config)
    const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    const fields = dataAccessor.getFieldsConfig() || {};

    // Get filter config for this model (optional)
    // Preferred: model-level `models.<Model>.filters`; fallback: legacy top-level `modelFilters.<Model>`
    const filterConfig = entity.config?.filters ?? req.adminizer.config.modelFilters?.[entity.name];
    const ormType = req.adminizer.ormAdapters?.[0]?.ormType;
    const isSequelize = ormType === 'sequelize';

    const filterFields: FilterField[] = [];

    for (const [fieldName, field] of Object.entries(fields)) {
        const type = getFieldType(field);
        const cfg = typeof field.config === 'object' && field.config !== null ? field.config as any : null;
        const customFilterHandlerId = isSequelize && cfg?.customFilter?.handlerId
            ? String(cfg.customFilter.handlerId)
            : undefined;
        const customFilterHandler = customFilterHandlerId
            ? req.adminizer.customFilterHandler?.get(customFilterHandlerId)
            : undefined;
        const customFilter = customFilterHandlerId
            ? {
                handlerId: customFilterHandlerId,
                conditionLabel: customFilterHandler?.name
                    || (cfg?.customFilter?.label ? String(cfg.customFilter.label) : undefined)
                    || customFilterHandlerId,
                inputConfig: customFilterHandler?.inputConfig,
            }
            : null;

        // Skip model-specific excluded fields
        if (filterConfig?.excludeFromFilters?.includes(fieldName)) {
            continue;
        }

        // Skip system fields (universal rule for all models)
        if (fieldName === 'id' || fieldName === 'ownerId' || fieldName === 'updatedAt') {
            continue;
        }

        const isRelationField = type === 'association' || type === 'association-many';

        // Base (non-relation) fields
        if (!isRelationField) {
            if (!isSimpleFilterField(type) && !customFilter) {
                continue;
            }

            filterFields.push({
                id: fieldName,
                label: getFieldLabel(req, fieldName, field),
                type,
                isCustomFilter: Boolean(customFilter),
                customFilterHandlerId: customFilter?.handlerId,
                customFilterConditionLabel: customFilter?.conditionLabel,
                customFilterInputConfig: customFilter?.inputConfig,
                required: Boolean((typeof field.config === 'object' && field.config !== null ? (field.config as any).required : false)),
                options: getFieldOptions(req, field),
            });
            continue;
        }

        // Relations in filter UI are supported only for Sequelize
        if (!isSequelize) {
            continue;
        }

        // Include relation with only simple fields of related model
        const relationFields = Object.entries(field.populated || {})
            .map(([relatedFieldName, relatedField]) => {
                const relatedType = getFieldType(relatedField);
                if (!isSimpleFilterField(relatedType)) {
                    return null;
                }

                return {
                    id: relatedFieldName,
                    label: getFieldLabel(req, relatedFieldName, relatedField),
                    type: relatedType,
                    options: getFieldOptions(req, relatedField),
                };
            })
            .filter((item): item is NonNullable<typeof item> => !!item);

        if (relationFields.length === 0) {
            continue;
        }

        filterFields.push({
            id: fieldName,
            label: getFieldLabel(req, fieldName, field),
            type,
            isRelation: true,
            relationFields,
        });
    }

    return res.json({
        model: entity.name,
        fields: filterFields,
    });
}
