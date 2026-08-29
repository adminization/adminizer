import {ControllerHelper} from "../helpers/controllerHelper";
import {Adminizer} from "../lib/Adminizer";
import {DataAccessor} from "../lib/DataAccessor";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";
import {Field} from "../helpers/fieldsHelper";

/**
 * Inline update controller for list view
 * PATCH /adminizer/model/:name/inline/:id
 * 
 * Body: { field: string, value: any }
 */
export default async function inlineUpdate(req: ReqType, res: ResType) {
    const allowedFieldTypes = new Set(['string', 'integer', 'number', 'range', 'boolean', 'float', 'email']);

    // Check ID
    if (!req.params.id) {
        return res.status(400).json({ error: 'Record ID is required' });
    }

    // Check field
    if (!req.body.field) {
        return res.status(400).json({ error: 'Field name is required' });
    }

    const modelResource = ControllerHelper.findModelResource(req);
    if (!modelResource.model) {
        return res.status(404).json({ error: 'Model not found' });
    }

    const fieldName = req.body.field;
    const newValue = req.body.value;

    // Get field config
    const dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "edit");
    const fields = dataAccessor.getFieldsConfig();
    const fieldConfig = fields[fieldName] as Field;

    if (!fieldConfig) {
        return res.status(400).json({ error: `Field '${fieldName}' not found` });
    }

    const identifierField =
        modelResource.config.identifierField ||
        req.adminizer.config.identifierField ||
        modelResource.model.primaryKey ||
        'id';

    const blockedInlineFields = new Set(['id', 'createdat', 'updatedat']);
    if (blockedInlineFields.has(fieldName.toLowerCase()) || fieldName === identifierField) {
        return res.status(403).json({ error: `Field '${fieldName}' cannot be edited inline` });
    }

    // Check if inline edit is explicitly disabled for this field
    const baseConfig = fieldConfig.config as BaseFieldConfig;
    if (baseConfig.inlineEditable === false) {
        return res.status(403).json({ error: `Field '${fieldName}' is not inline editable` });
    }

    // Check if field has displayModifier (should not be editable)
    if (baseConfig.displayModifier) {
        return res.status(403).json({ error: `Field '${fieldName}' has displayModifier and cannot be edited` });
    }

    // Check if field type supports inline editing.
    // Prefer explicit field config type, fallback to model metadata type.
    const fieldType = (baseConfig.type || fieldConfig.model?.type || '').toLowerCase();
    if (!fieldType || !allowedFieldTypes.has(fieldType)) {
        return res.status(403).json({ error: `Field '${fieldName}' type does not support inline editing` });
    }

    // Validate value
    const validationError = validateInlineValue(newValue, baseConfig, fieldType);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    // Convert value based on field type
    const convertedValue = convertInlineValue(newValue, fieldType);

    // Update record
    const id = req.params.id;
    // Reuse the resolved identifier: without the primary-key fallback the key is
    // `undefined`, the adapter drops the unknown condition, and the update hits every
    // record the user may reach instead of the one addressed by :id.
    const params: Record<string, string | number> = {[identifierField]: id};

    try {
        const updated = await modelResource.model.update(params, { [fieldName]: convertedValue }, dataAccessor);

        // Record access is enforced by the criteria, so a record out of the user's reach
        // simply matches nothing. Reporting success would leave the edited value on screen.
        if (!updated.length) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.json({
            success: true, 
            data: { 
                id, 
                field: fieldName, 
                value: convertedValue 
            } 
        });
    } catch (error) {
        Adminizer.log.error('Inline update error:', error);
        return res.status(500).json({ error: 'Failed to update record' });
    }
}

/**
 * Validate value according to inline validation rules
 */
function validateInlineValue(
    value: any,
    config: BaseFieldConfig,
    fieldType?: string
): string | null {
    const validation = config.inlineValidation;

    // String validations
    if (typeof value === 'string') {
        if (validation?.minLength && value.length < validation.minLength) {
            return `Value must be at least ${validation.minLength} characters`;
        }
        if (validation?.maxLength && value.length > validation.maxLength) {
            return `Value must be at most ${validation.maxLength} characters`;
        }
        if (validation?.pattern && !new RegExp(validation.pattern).test(value)) {
            return `Value does not match required pattern`;
        }
    }

    // Number validations
    if (typeof value === 'number' || ['integer', 'number', 'float', 'range'].includes(fieldType || '')) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            return 'Invalid number';
        }
        if (validation?.min !== undefined && numValue < validation.min) {
            return `Value must be at least ${validation.min}`;
        }
        if (validation?.max !== undefined && numValue > validation.max) {
            return `Value must be at most ${validation.max}`;
        }
    }

    // Custom validation
    if (validation?.validate) {
        const result = validation.validate(value);
        if (typeof result === 'string') {
            return result;
        }
        if (result === false) {
            return 'Invalid value';
        }
    }

    return null;
}

/**
 * Convert value to appropriate type
 */
function convertInlineValue(value: any, fieldType?: string): any {
    if (value === null || value === undefined) {
        return value;
    }

    switch (fieldType) {
        case 'boolean':
            return Boolean(value);
        case 'integer':
            return parseInt(value, 10);
        case 'number':
        case 'float':
            return parseFloat(value);
        case 'range':
            return typeof value === 'string' ? parseFloat(value) : Number(value);
        case 'email':
        case 'string':
        case 'text':
        default:
            return typeof value === 'string' ? value : String(value);
    }
}


