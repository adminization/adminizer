import { ModelResource, PropsField } from "../interfaces/types";
import inertiaActionsHelper, { Actions } from "./inertiaActionsHelper";
import { Fields, Field } from "./fieldsHelper";
import {
    BaseFieldConfig,
    HandsontableOptions, MediaManagerOptionsField,
    TuiEditorOptions,
    WysiwygOptions
} from "../interfaces/adminpanelConfig";
import { Control, ControlType } from "../lib/controls/Control";
import { ModelAnyField } from "../lib/model/AbstractModel";
import { isObject } from "./JsUtils";
import { MediaManagerHandler } from "../lib/media-manager/MediaManagerHandler";
import {Adminizer} from "../lib/Adminizer";

const missingControlWarnings = new Set<string>();

/**
 * Get ISO week number from date
 * @param date - Date object
 * @returns Week number (1-53)
 */
function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export type PropsFieldType =
    'text'
    | 'number'
    | 'range'
    | 'week'
    | 'month'
    | 'email'
    | 'color'
    | 'time'
    | 'date'
    | 'datetime-local'
    | 'password'
    | 'select'
    | 'select-many'
    | 'association-many'
    | 'association'
    | 'textarea'
    | 'mediamanager'
    | 'single-file'
    | 'checkbox'
    | ControlType

interface FieldProps extends Record<string | number | symbol, unknown> {
    edit: boolean;
    view: boolean;
    actions: Actions[],
    notFound: string
    search: string
    btnBack: {
        title: string;
        link: string;
    },
    fields: PropsField[],
    btnSave: {
        title: string;
    },
    btnHistory: {
        title: string,
    },
    postLink: string,
    model: string
}

export default function inertiaAddHelper(req: ReqType, modelResource: ModelResource, fields: Fields, record?: Record<string, string | boolean | number | string[]>, view: boolean = false) {
    const actionType = 'add';
    let props: FieldProps = {
        edit: !!record,
        view: view,
        actions: [],
        notFound: req.i18n.__('Not found'),
        search: req.i18n.__('Search'),
        btnBack: {
            title: req.i18n.__('Back'),
            link: modelResource.uri
        },
        fields: [],
        btnSave: {
            title: req.i18n.__('Save')
        },
        btnHistory: {
            title: req.i18n.__('History'),
        },
        postLink: record ? `${modelResource.uri}/edit/${record.id}` : `${modelResource.uri}/add`,
        model: modelResource.name.toLocaleLowerCase()
    }
    props.actions = inertiaActionsHelper(actionType, modelResource, req)

    const config = req.adminizer.configHelper.getConfig();
    for (const key of Object.keys(fields)) {
        if ((!config.showORMtime) && (key === 'createdAt' || key === 'updatedAt')) continue
        let field = fields[key] as Field
        let fieldConfig = field.config
        if (!isObject(fieldConfig)) throw `Type error: fieldConfig is object`
        if (!!fieldConfig.visible === false) continue

        const type = (fieldConfig.type || fieldConfig.type).toLowerCase()

        //@ts-ignore TODO: fix model validations
        const isIn = typeof fieldConfig.isIn === 'object' ? fieldConfig.isIn : (field.model && typeof { ...field.model.validations }.isIn === 'object' ? { ...field.model.validations }.isIn : [])

        let label = fieldConfig.title ?? ''
        let tooltip = fieldConfig.tooltip ?? ''
        let name = key
        let fieldType: PropsFieldType = 'text'
        let disabled = fieldConfig.disabled ?? false
        let required = fieldConfig.required ?? false
        let options: any = {}
        let value = record ? record[key] : undefined
        let relatedModel: string | undefined = undefined
        let canCreateRelated = false
        const controlContext = `${modelResource.name}.${key}`

        //@ts-ignore TODO: fix field type
        if (modelResource.config.model && req.adminizer.configHelper.isId(field, modelResource.config.model)) {
            disabled = true
        }

        if (['string', 'password', 'date', 'datetime', 'time', 'integer', 'number', 'float', 'email', 'month', 'week', 'range'].includes(type)) {
            fieldType = inputText(type, isIn)
            if (type === 'range') {
                options = { ...fieldConfig.options }
                if ("min" in fieldConfig.options) {
                    value = record ? record[key] : fieldConfig.options.min ? fieldConfig.options.min : 0
                }
            }
            // Format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
            if (type === 'datetime' && value) {
                const date = new Date(value as string | Date);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    value = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            }
            // Format week for week input (YYYY-Www)
            if (type === 'week' && value) {
                const date = new Date(value as string | Date);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const week = getWeekNumber(date);
                    value = `${year}-W${String(week).padStart(2, '0')}`;
                }
            }
        }

        if (type === 'color') {
            fieldType = 'color'
            value = record ? (record[key] ? record[key] : '#000000') : '#000000'
        }

        if (type === 'select') {
            fieldType = 'select'
        }

        if (type === 'boolean' || type === 'binary') {
            fieldType = 'checkbox'
        }

        if (['text', 'longtext', 'mediumtext'].includes(type)) {
            fieldType = 'textarea'
        }

        if (type === 'association' || type === 'association-many') {
            fieldType = type === 'association' ? 'association' : 'association-many'
            const { initValue, initOptions } = setAssociationValues(field, value as string[])
            options = initOptions
            value = initValue
            relatedModel = (field.model?.model || field.model?.collection) as string | undefined
            if (relatedModel && req.user) {
                canCreateRelated = req.adminizer.accessRightsHelper.hasPermission(`create-${relatedModel}-model`, req.user)
            } else if (relatedModel && !req.adminizer.config.auth?.enable) {
                canCreateRelated = true
            }
        }

        if (type === 'select-many') {
            fieldType = 'select-many'
            const { initValue, initOptions } = setSelectMany(isIn, value as string[])
            options = initOptions
            value = initValue
        }

        if (['ckeditor', 'wysiwyg', 'texteditor', 'word'].includes(type)) {
            fieldType = 'wysiwyg';
            options = getControlsOptions(fieldConfig, req, fieldType as ControlType, 'ckeditor', controlContext)
        }

        if (['tui', 'tuieditor', 'toast-ui'].includes(type)) {
            fieldType = 'markdown';
            options = getControlsOptions(fieldConfig, req, fieldType as ControlType, 'toast-ui', controlContext)
        }

        if (type === 'table') {
            fieldType = 'table';
            options = getControlsOptions(fieldConfig, req, fieldType as ControlType, 'handsontable', controlContext)
        }
        if (['jsoneditor', 'json', 'array', 'object'].includes(type)) {
            fieldType = 'jsonEditor';
            options = getControlsOptions(fieldConfig, req, fieldType as ControlType, 'jsoneditor', controlContext)
        }

        if (['ace', 'html', 'xml', 'aceeditor', 'code'].includes(type)) {
            fieldType = 'codeEditor';
            options = getControlsOptions(fieldConfig, req, fieldType as ControlType, 'monaco', controlContext)
        }

        if (['geojson', 'geo-polygon', 'geo-marker'].includes(type)) {
            fieldType = 'geoJson';
            options = getControlsOptions(fieldConfig, req, fieldType as ControlType, 'leaflet', controlContext)
        }

        if (type === 'mediamanager' || type === 'single-file') {
            const mConfig = field.config as BaseFieldConfig
            const mOptions = mConfig?.options as MediaManagerOptionsField

            const mediaManager = req.adminizer.mediaManagerHandler.get(mOptions.id || 'default')
            if (!mediaManager) {
                options = {}
            } else {
                fieldType = type
                options = (field.config as BaseFieldConfig).options
            }
        }

        props.fields.push({
            label: label,
            tooltip: tooltip,
            name: name,
            type: fieldType,
            value: value,
            disabled: disabled,
            required: required,
            isIn: isIn,
            options: options,
            relatedModel: relatedModel,
            canCreateRelated: canCreateRelated,
        })
    }
    return props
}

export function getControlsOptions(
    fieldConfig: Field["config"],
    req: ReqType,
    type: ControlType,
    defaultControlName: string,
    context?: string
) {
    if (!isObject(fieldConfig)) throw `Type error: fieldConfig is object`
    const fieldOptions = fieldConfig?.options as WysiwygOptions | TuiEditorOptions | HandsontableOptions;

    const control = getControl(req, type, fieldOptions?.name, defaultControlName, context);
    const editorName = control.getName();
    const shouldUseFieldConfig = !fieldOptions?.name || fieldOptions.name === editorName;

    const options = {
        name: editorName,
        config: {
            ...(control?.getConfig() || {}), // Base config of the editor
            ...(shouldUseFieldConfig ? fieldOptions?.config || {} : {}),
        },
        path: control.getJsPath(),
        cssPath: control.getCssPath(),
    };

    // If items are provided, use them instead of the CKEditor defaults.
    if (
        type === 'wysiwyg'
        && editorName === 'ckeditor'
        && shouldUseFieldConfig
        && (fieldOptions as WysiwygOptions)?.config?.items
    ) {
        options.config = {items: (fieldOptions as WysiwygOptions).config.items};
    }

    return options
}

export function inputText(type: string, isIn: string[]) {
    if (type === "string" && isIn.length) {
        return "select"
    } else {
        switch (type) {
            case "password":
                return "password"
            case "date":
                return "date"
            case "datetime":
                return "datetime-local"
            case "time":
                return "time"
            case "color":
                return "color"
            case "email":
                return "email"
            case "month":
                return "month"
            case "week":
                return "week"
            case "range":
                return "range"
            case "integer":
            case "number":
            case "float":
                return "number"
            default:
                return "text"
        }
    }
}

export function getControl(
    req: ReqType,
    type: ControlType,
    name: string | undefined,
    defaultControlName: string,
    context?: string
): Control {
    const requestedControlName = name ?? defaultControlName;
    const requestedControl = req.adminizer.controlsHandler.get(type, requestedControlName);
    if (requestedControl) {
        return requestedControl;
    }

    if (name) {
        const warningKey = `${context ?? "unknown"}:${type}:${name}:${defaultControlName}`;
        if (!missingControlWarnings.has(warningKey)) {
            missingControlWarnings.add(warningKey);
            Adminizer.log.warn(
                `Control "${name}" for ${context ?? `type "${type}"`} is unavailable; ` +
                `falling back to "${defaultControlName}".`
            );
        }
    }

    const defaultControl = req.adminizer.controlsHandler.get(type, defaultControlName);
    if (!defaultControl) {
        throw new Error(
            `Default control "${defaultControlName}" for type "${type}" is not registered` +
            (context ? ` (${context})` : "")
        );
    }

    return defaultControl;
}

export function setAssociationValues(field: Field, value: string[]) {
    let options = []
    let initValue: string[] = []
    const config = field.config
    if (!isObject(config)) throw `Type error: config is object`

    const isOptionSelected = (option: string | number | boolean, value: string | number | boolean | (string | number | boolean)[]): boolean => {
        if (Array.isArray(value)) {
            return value.includes(option);
        } else {
            return (option == value);
        }
    }

    const getAssociationValue = (value: ModelAnyField, field: Field): string | string[] => {
        const displayField = field.modelConfig?.titleField || 'id';
        if (value === null) return []

        if (Array.isArray(value)) {
            return value
                .map(val => (val as unknown as { [key: string]: any })[displayField])
        }

        if (typeof value === 'object') {
            return (value as { [key: string]: any })[displayField];
        }

        return String(value);
    }


    for (let opt of config.records) {
        const optAny = opt as Record<string, any>;

        const displayField = typeof field.modelConfig.titleField !== 'undefined'
            ? field.modelConfig.titleField
            : typeof optAny.title !== 'undefined'
                ? 'title'
                : typeof optAny.name !== 'undefined'
                    ? 'name'
                    : config.identifierField;

        const label = typeof config.displayModifier === 'function'
            ? config.displayModifier(opt)
            : optAny[displayField];

        options.push({
            label,
            value: optAny[config.identifierField],
        });

        if (!isObject(config)) throw `Type error: config is object`
        if (config.identifierField && isOptionSelected(opt[config.identifierField], getAssociationValue(value, field))) {
            initValue.push(opt[config.identifierField])
        }
    }
    return {
        initOptions: options,
        initValue: initValue,
    }
}

export function setSelectMany(isIn: string[], value: string[] | undefined) {
    let options = []
    let initValue: string[] = []
    for (let opt of isIn) {
        options.push({
            label: opt,
            value: opt,
        })
        if (value && value.includes(opt)) {
            initValue.push(opt)
        }
    }
    return {
        initOptions: options,
        initValue: initValue
    }
}


