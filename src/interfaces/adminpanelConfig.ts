import {MaterialIcon} from "./MaaterialIcons";
//@ts-ignore
import {EditorOptions} from "@toast-ui/editor/types/editor";
// @ts-ignore - settings.d.ts exists but is not exposed via handsontable's package.json exports
import {GridSettings as HandsontableSettings} from "handsontable/settings";
import {GroupAP} from "../models/GroupAP";
import {UserAP} from "../models/UserAP";
import {InternalModelAccessMap} from "./internalModelAccess";

/**
 * Controller function type - async function that handles requests and returns a response
 */
export type ControllerFunction = (req: ReqType, res: ResType) => Promise<any>

export type AdminpanelIcon = MaterialIcon
export type FieldsTypes =
    "string" |
    "password" |
    "date" |
    "datetime" |
    "time" |
    "integer" |
    "number" |
    "float" |
    "color" |
    "email" |
    "month" |
    "week" |
    "range" |
    "boolean" |
    "binary" |
    "text" |
    "longtext" |
    "mediumtext" |
    "ckeditor" |
    "wysiwyg" |
    "texteditor" |
    "word" |
    'tui' |
    'tuieditor' |
    'toast-ui' |
    "jsoneditor" |
    "json" |
    "array" |
    "object" |
    "ace" |
    "code" |
    "html" |
    "xml" |
    "aceeditor" |
    "menu" |
    "schedule" |
    "worktime" |
    "association" |
    "association-many" |
    "select" |
    "select-many" |
    "table" |
    "geojson" |
    "mediamanager" |
    "single-file" |

    /**
     * it will be needed only for polygon data
     */
    "geo-polygon"

export type ActionType = "list" | "edit" | "add" | "remove" | "view"
export type ListPageSize = 5 | 20 | 50

interface DashboardConfig {
    autoloadWidgetsPath: string
    /**
     * Adds widgets by default, taking into account user rights
     * This is an array of widgetIds that will be added
     */
    defaultWidgets: string[]
}


export interface AdminpanelConfig {
    routePrefix: string
    list?: {
        /**
         * Default records count per list page.
         * @default 50
         */
        defaultPageSize?: ListPageSize
    }
    /**
     * Custom favicon URL for admin pages.
     * - absolute URL is used as-is (`https://...`, `//...`, `data:...`)
     * - path starting with `/` is treated as absolute path from site root
     * - relative path is resolved from `routePrefix`
     * @default `${routePrefix}/files/favicon.png`
     */
    favicon?: string

    /** prepare to impl dashboard*/
    dashboard?: boolean | DashboardConfig
    theme?: string
    /**
     * Enable or disable auth for adminpanel
     * by default is false
     */
    auth?: {
        /** Enable or disable authentication for admin panel */
        enable: boolean,
        /** Enable crypto-puzzle CAPTCHA (default: true) */
        captcha?: boolean,
        /** Description displayed on login page */
        description?: string,
        /**
         * Optional additional link at the bottom of the login page
         * Example:
         *  addishinalLoginPage: { link: '/model/userap/register', textKey: 'Additional login page' }
         *  link can be relative to routePrefix (e.g. 'model/help' or '/model/help') or absolute (https://...)
         */
        addishinalLoginPage?: {
            /** Target URL; relative to routePrefix unless absolute */
            link: string,
            /** Optional i18n key for label; defaults to 'Additional login page' */
            textKey?: string
        }
    }
    /**
     * Models configuration
     * */
    models: {
        [key: string]: ModelConfig
    }
    /**
     * For custom adminpanel sections, displays inside header
     * */
    sections?: HrefConfig[]
    /**
     * Force set primary key
     * @deprecated required field for each model
     * */
    identifierField?: string
    brand?: {
        link: boolean | string | HrefConfig
    }
    /**
     * Left-side navigation bar
     * */
    navbar?: {
        /**
         * will be created at the bottom of the sidenav panel
         * */
        additionalLinks?: HrefConfig[]
        /**
         * Optional callback to filter or transform all navbar links after models have been processed.
         * Receives all links (static + model-generated) and the current user; returns the final array.
         */
        handleAdditionalLinks?: (user: UserAP, allLinks: HrefConfig[]) => HrefConfig[]
        /**
         * Per-section handlers, applied after all links (static + model-generated) are collected.
         * Each key is a section name; the handler receives links belonging to that section.
         */
        sectionHandlers?: {
            [section: string]: (user: UserAP, links: HrefConfig[]) => HrefConfig[]
        }
    }
    /**
     * Policies that will be executed before going to every page
     * */
    middlewares?: MiddlewareType[]
    styles?: string[]
    scripts?: {
        header?: string[]
        footer?: string[]
    }
    /**
     * Text for welcome page
     * */
    welcome?: {
        title?: string
        text?: string
    }
    /**
     * For disabling csrf
     * */
    security?: {
        csrf?: boolean
    }
    /**
     * Text translation
     * */
    translation?: {
        /**
         * Locales list
         * */
        locales: string[]
        /**
         * Relative path from project root to translations folder
         * */
        directory?: string
        /**
         * Relative path from project root to directory where missing translation keys are written in dev mode
         * */
        missingTranslationDirectory?: string
        /**
         * @deprecated use `directory`
         */
        path?: string
        defaultLocale: string
    } | false
    /**
     * Prime administrator login credentials
     * */
    administrator?: {
        login: string
        password: string
    }
    registration?: {
        enable: boolean
        defaultUserGroup: string // group name that is considered to be default
        confirmationRequired: boolean
    }
    /**
     * Enable/disable displaying createdAt and updatedAt fields in `edit` and `add` sections
     * */
    showORMtime?: boolean
    /**
     * Adminpanel package.json config
     * */
    package?: any
    /**
     * Available timezones list
     * */
    timezones?: {
        id: string
        name: string
    }[]
    /**
     * Show adminpanel version in the sidebar footer.
     * - `false` / omitted — hidden
     * - `true` — show build version with no extras
     * - `string` — show that string as the version label
     * - `object` — full control:
     *   - `text`  — custom version label (falls back to build version)
     *   - `link`  — URL opened when the label is clicked (opens in new tab)
     *   - `hint`  — tooltip shown on hover
     */
    showVersion?: boolean | string | {
        text?: string
        link?: string
        hint?: string
    }

    /**
     *
     * System field for store absolute root path adminpanel hookfolder
     */
    rootPath?: string

    mediamanager?: MediaManagerConfig

    /** System settings */
    system?: {
        /** Default ORM adapter for system models */
        defaultORM: string
        /**
         * Extra internal model access scopes for modules and project code.
         * Built-in scopes are registered by Adminizer.
         */
        internalModelAccess?: InternalModelAccessMap
    }

    bind?: {
        public: boolean
    }

    notifications?: {
        enabled: boolean
        enableGeneral?: boolean
        initTab?: string
    }
    aiAssistant?: {
        enabled: boolean
        defaultModel?: string
        models?: string[]
    }
    cors?: {
        enabled: boolean;
        origin: string[] | string;
        path: string
        credentials?: boolean;
        methods?: string[];
        allowedHeaders?: string[];
    };
    history?: {
        enabled: boolean,
        adapter?: string,
        excludeModels?: string[],
    }
    /**
     * Filter system configuration
     */
    filters?: {
        /**
         * Global enable/disable of the filter system
         * @default true
         */
        enabled?: boolean;
    }
    /**
     * Filter settings for specific models
     * @deprecated Use model-level `models.<Model>.filters` instead
     */
    modelFilters?: {
        [modelName: string]: ModelFiltersConfig;
    };
}

/**
 * Filter configuration for a specific model
 */
export interface ModelFiltersConfig {
    /**
     * Enable filters for this model
     * Works only when global filters.enabled is not false
     * @default undefined (use global setting)
     */
    enabled?: boolean;

    /**
     * Use legacy search instead of filters
     * @default false
     */
    useLegacySearch?: boolean;

    /**
     * Fields to exclude from auto-generated filters
     * @example ['password', 'apiKey', 'token']
     */
    excludeFields?: string[];

    /**
     * Fields to include in auto-generated filters (whitelist mode)
     * If specified, only these fields will have filters generated
     * Takes priority over excludeFields
     */
    includeFields?: string[];

    /**
     * Fields to exclude from filter fields API
     * Use this to hide specific fields from the filter UI
     * @example ['password', 'apiKey', 'token', 'createdAt']
     */
    excludeFromFilters?: string[];

    /**
     * Custom field type overrides for filters
     * Use this to change how a field appears in the filter UI
     * @example { my_field: 'select' }
     */
    fieldTypes?: {
        [fieldName: string]: string;
    };
}

export interface ModelConfig {
    adapter?: string
    title: string
    /**
     * Model name
     * */
    model: string
    /**
     * Optional display name for history. Should be a attribute of the model, or a function.
     */
    displayName?: ((v: any) => string) | string
    /**
     * If the field is not definitely, then it will appear in Navbar
     * */
    navbar?: {
        /**
         * @default true
         */
        visible?: boolean
        /**
         * User groups who will see the menu item
         * For which it will be shown if not established will be shown to all groups who have the rights to read
         */
        groupsAccessRights?: string[]
        /**
         * Optional section grouping for navbar items (side navigation)
         */
        section?: string
    }
    /**
     * Model resource fields configuration
     * */
    fields?: FieldsModels
    /**
     * Filter settings for this model
     */
    filters?: ModelFiltersConfig
    /**
     * List display configuration
     * */
    list?: {
        /**
         * Configuration for models' fields that will be displayed on 'list' page
         * */
        fields?: FieldsModels

        /**
         * Actions configuration that will be displayed
         * */
        actions?: {
            global?: HrefConfig[]
            inline?: HrefConfig[]
        }

        /**
         * Allows you to filter records by criteria,
         * by default the first one will be selected if filters are specified.
         */
        filter?: {
            [key: string]: {
                name: string
                criteria: Record<string, any>
            }
        }
    } | boolean
    /**
     * Configuration for 'create model' action or disabling/enabling it
     * */
    add?: CreateUpdateConfig | boolean
    /**
     * Configuration for 'update model' action or disabling/enabling it
     * */
    edit?: CreateUpdateConfig | boolean
    /**
     * Disabling/enabling 'delete model' action
     * */
    remove?: boolean
    /**
     * Disabling/enabling 'read model' action
     * */
    view?: boolean
    /**
     * Model resource actions displayed in left navbar for specific model resource
     * */
    tools?: HrefConfig[]
    /**
     * Model resource icon
     * */
    icon?: MaterialIcon

    /**
     * The field that will be shown for communication
     * @default `title` or `name`
     */
    titleField?: string
    /**
     * Force set primary key
     * */
    identifierField?: string
    /** In this field we can set model field, for which we want to check user access right.
     *  May be association or association-many to UserAP or GroupAP */
    userAccessRelation?: {
        field: string // field that associates to the intermediate model
        via?: string // field in intermediate model that associates with userap/groupap
    } | string
    userAccessRelationCallback?: (userWithGroups: UserWithGroups, record: any) => boolean
    /**
     * @IDEA
     * If you need override values on the save in DB, this can be done here
     createUpdateOverride?: (data: any, action: ActionType) => any
     */
}

type UserWithGroups = UserAP & { groups: GroupAP[] }

export type ModelFieldConfig = (BaseFieldConfig | TuiEditorFieldConfig) & { groupsAccessRights?: string[] }

export interface FieldsModels {
    [key: string]: ModelFieldConfig
}

export interface BaseFieldConfig {
    title?: string
    type?: FieldsTypes
    /**
     * Field description
     * */
    tooltip?: string
    /**
     * Options for widgets like 'Navigation', 'Schedule'
     * */
    options?: ScheduleOptionsField | MediaManagerOptionsField | TuiEditorOptions | RangeType | WysiwygOptions | HandsontableOptions | JsonEditorOptions
    /**
     * Function that makes data modification on list view
     * */
    displayModifier?: (v: any) => string
    /**
     * Force set primary key
     * */
    identifierField?: string
    /**
     * Label for associations
     * @deprecated use model labelField prop
     * */
    displayField?: string
    /**
     * Field that will be used only in select and select-pure widget
     * */
    isIn?: object

    /** Show as disabled element HTML */
    disabled?: boolean

    /** Show as required element HTML */
    required?: boolean

    /** show or hode element, default `true` */
    visible?: boolean

    /**
     * Allow inline editing of this field in list view
     * Inline editing is enabled by default for supported field types.
     * Set to false to explicitly disable inline editing for this field.
     */
    inlineEditable?: boolean

    /**
     * Validation rules for inline editing
     * Applied when field is updated via inline edit
     */
    inlineValidation?: {
        /** Minimum length for string fields */
        minLength?: number
        /** Maximum length for string fields */
        maxLength?: number
        /** Minimum value for number fields */
        min?: number
        /** Maximum value for number fields */
        max?: number
        /** Regex pattern for validation */
        pattern?: string
        /** Custom validation function */
        validate?: (value: any) => boolean | string
    }

    /**
     * Attach a custom filter handler to this field.
     * Handler must be registered in Adminizer instance via `customFilterHandler`.
     */
    customFilter?: {
        /**
         * Handler ID in format "ModelName.fieldName"
         */
        handlerId: string
        /**
         * @deprecated Condition label is taken from handler class `name`
         */
        label?: string
    }
}

export interface TuiEditorFieldConfig extends BaseFieldConfig {
    type: 'tui' | 'tuieditor' | 'toast-ui'
    options: TuiEditorOptions
}

export interface MediaManagerOptionsField {
    id: 'default' | string
    group: string,
    accept: string [],
    initTab?: 'tile-image' | 'table-video' | 'table-text' | 'table-application' | 'table-all' | 'tile-all'
    config?: Record<string, any>
    onlyView?: boolean
}

interface RangeType {
    min?: number
    max?: number
}

export interface TuiEditorOptions {
    name?: string;
    config: Partial<EditorOptions>;
}

export interface HandsontableOptions {
    name?: string;
    config?: HandsontableSettings
}

export interface JsonEditorOptions {
    name?: string;
    config?: {
        mode?: 'tree' | 'text' | 'table'
        schema?: Record<string, unknown>;
        json?: Record<string, unknown> | unknown[];
    }
}

export interface WysiwygOptions {
    name?: string;
    config?: {
        items: string[];
    } | {
        [key: string]: Record<string, unknown>;
    };
}

interface ScheduleOptionsField {
    supportOldVersion?: boolean
    /**
     * add list of properties that can be chosen
     * */
    propertyList?: {
        [key: string]: {
            type: string
            title: string
            description?: string
            required?: string
        }
    }
    /**
     * forbid or allow displaying data, time or break fields
     * */
    permutations?: {
        time?: boolean
        date?: boolean
        break?: boolean
        /**
         * forbid or allow displaying the pop-up (modal window)
         * */
        options?: boolean
    }
}

export interface CreateUpdateConfig {
    fields?: FieldsModels
    /**
     * callback for data modification before saving record
     *
     * Function(reqData) {return reqData}
     * */
    entityModifier?: <T>(fieldData: T) => T
    /**
     * You can change standard controller for any entity by this property
     * Can be either a string path (for dynamic import) or a controller function
     * */
    controller?: string | ControllerFunction
}

export interface HrefConfig {
    id: string
    title: string
    link: string
    /**
     * Blank or self
     */
    type: 'blank' | 'self',
    icon?: MaterialIcon
    /**
     * Only for view, controller still uses his own access rights token
     * */
    accessRightsToken?: string | undefined,
    /**
     * For menu items only
     * */
    subItems?: HrefConfig[]
    /**
     * Optional section grouping for navbar items (side navigation)
     */
    section?: string
}

export interface MediaManagerConfig {
    fileStoragePath: string
    allowMIME?: string[]
    maxByteSize?: number
    imageSizes?: {
        [key: string]: {
            width: number
            height: number
        }
    },
}

export type AdminizerConfig = AdminpanelConfig
