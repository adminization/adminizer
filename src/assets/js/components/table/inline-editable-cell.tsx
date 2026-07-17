import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { simpleSanitizeHtml } from '@/lib/utils';
import { adminApi } from '@/lib/admin-api';
import { toast } from 'sonner';
import { BaseFieldConfig } from '../../../../interfaces/adminpanelConfig';

interface InlineEditableCellProps {
    value: any;
    fieldName: string;
    recordId: any;
    modelName: string;
    fieldType?: string;
    fieldConfig: BaseFieldConfig;
    hasDisplayModifier: boolean;
    onUpdateRecord: (recordId: any, fieldName: string, newValue: any) => void;
}

export function InlineEditableCell({
    value,
    fieldName,
    recordId,
    modelName,
    fieldType,
    fieldConfig,
    hasDisplayModifier,
    onUpdateRecord
}: InlineEditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // List of field types that support inline editing
    const allowedFieldTypes = ['string', 'integer', 'number', 'range', 'boolean', 'float', 'email'];

    // Check if field can be edited
    const isFieldTypeAllowed = allowedFieldTypes.includes(fieldType?.toLowerCase() || '');
    const isInlineEditableEnabled = fieldConfig.inlineEditable !== false;
    const blockedInlineFields = new Set(['id', 'createdAt', 'updatedAt']);
    const isSystemBlockedField = blockedInlineFields.has(fieldName);
    const canEdit = isInlineEditableEnabled && !isSystemBlockedField && !hasDisplayModifier && isFieldTypeAllowed;

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            // For text inputs, select all text
            if (fieldType !== 'boolean' && inputRef.current instanceof HTMLInputElement) {
                inputRef.current.select();
            }
        }
    }, [isEditing, fieldType]);

    // Reset value when starting edit
    useEffect(() => {
        if (isEditing) {
            setEditValue(value);
        }
    }, [isEditing, value]);

    const handleDoubleClick = useCallback(() => {
        if (!canEdit) return;
        setIsEditing(true);
    }, [canEdit]);

    const handleSave = useCallback(async () => {
        if (!canEdit || isLoading) return;

        // Don't save if value hasn't changed
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);

        try {
            const response = await adminApi.patch<any>(
                `${window.routePrefix}/model/${modelName}/inline/${recordId}`,
                {
                    field: fieldName,
                    value: editValue
                }
            );

            if (response.data.success) {
                // Update the record in table data
                onUpdateRecord(recordId, fieldName, response.data.data.value);
                toast.success('Field updated successfully');
                setIsEditing(false);
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Failed to update field';
            toast.error(errorMessage);
            setEditValue(value); // Reset to original value
            setIsEditing(false);
        } finally {
            setIsLoading(false);
        }
    }, [canEdit, isLoading, editValue, value, modelName, recordId, fieldName, onUpdateRecord]);

    const handleCancel = useCallback(() => {
        setEditValue(value);
        setIsEditing(false);
    }, [value]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    const handleBlur = useCallback(() => {
        // Small delay to allow click on save/cancel buttons if any
        setTimeout(() => {
            if (isEditing) {
                handleSave();
            }
        }, 100);
    }, [isEditing, handleSave]);

    // If cannot edit, render static cell
    if (!canEdit) {
        const cleanHtml = simpleSanitizeHtml(value?.toString() ?? '');
        return (
            <div
                className="text-center max-w-[300px] overflow-hidden text-ellipsis"
                dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
        );
    }

    // Render boolean type as checkbox
    if (fieldType === 'boolean') {
        if (isEditing) {
            return (
                <div className="flex items-center justify-center gap-2">
                    <Checkbox
                        checked={Boolean(editValue)}
                        onCheckedChange={(checked) => setEditValue(Boolean(checked))}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isLoading}
                        autoFocus
                    />
                </div>
            );
        }

        return (
            <div
                className="text-center max-w-[300px] overflow-hidden text-ellipsis cursor-pointer hover:bg-muted/50 rounded transition-colors"
                onDoubleClick={handleDoubleClick}
                title="Double-click to edit"
            >
                {value ? '✓' : '✗'}
            </div>
        );
    }

    // Render input for other types
    if (isEditing) {
        const inputType = getInputType(fieldType);
        const minMax = getRangeProps(fieldConfig);

        return (
            <div className="flex items-center gap-1">
                <Input
                    ref={inputRef}
                    type={inputType}
                    value={editValue ?? ''}
                    onChange={(e) => setEditValue(inputType === 'number' ? e.target.value : e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    min={minMax.min}
                    max={minMax.max}
                    step={inputType === 'number' ? 'any' : undefined}
                    className="h-8 text-sm"
                    autoFocus
                />
            </div>
        );
    }

    // Display mode - clickable to activate editing
    const displayValue = value?.toString() ?? '';
    const cleanHtml = simpleSanitizeHtml(displayValue);

    return (
        <div
            className="text-center max-w-[300px] overflow-hidden text-ellipsis cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
            onDoubleClick={handleDoubleClick}
            title="Double-click to edit"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
}

/**
 * Get HTML input type based on field type
 */
function getInputType(fieldType?: string): string {
    switch (fieldType) {
        case 'integer':
        case 'number':
        case 'float':
            return 'number';
        case 'range':
            return 'number';
        case 'email':
            return 'email';
        case 'string':
        case 'text':
        default:
            return 'text';
    }
}

/**
 * Get min/max props for range fields
 */
function getRangeProps(fieldConfig: BaseFieldConfig): { min?: number; max?: number } {
    const options = fieldConfig.options as any;
    if (options && typeof options === 'object') {
        return {
            min: options.min,
            max: options.max
        };
    }

    // Also check inlineValidation
    const validation = fieldConfig.inlineValidation;
    if (validation) {
        return {
            min: validation.min,
            max: validation.max
        };
    }

    return {};
}


