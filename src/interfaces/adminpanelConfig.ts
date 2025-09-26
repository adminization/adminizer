import {MaterialIcon} from "./MaaterialIcons";
import {EditorOptions} from "@toast-ui/editor/types/editor";
import {GridSettings as HandsontableSettings} from "handsontable/settings";
import {Actions} from "helpers/inertiaActionsHelper";
import {Adminizer} from "lib/Adminizer";
import {GroupAP} from "models/GroupAP";
import {UserAP} from "models/UserAP";

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

    /**
     * it will be needed only for polygon data
     */
    "geo-polygon"

type SetFunction = (slug: string, key: string, data: any) => Promise<void>;
type GetFunction = (slug: string, key: string) => Promise<any>;

export type ActionType = "list" | "edit" | "add" | "remove" | "view"

interface DashboardConfig {
    autoloadWidgetsPath: string
    /**
     * Adds widgets by default, taking into account user rights
     * This is an array of widgetIds that will be added
     */
    defaultWidgets: string[]
}


// TODO make fields (complexType | boolean into 2 different fields, manually changing config or somehow programmatically)
// TODO fields that can be both object and boolean should be divided into main field and "fieldnameEnable" - type boolean
export interface AdminpanelConfig {
    routePrefix: string

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
     * @alpha
     * Models configuration
     * reference upload contoroller ~50 line
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
        additionalLinks: HrefConfig[]
    }
    /**
     * Policies that will be executed before going to every page
     * */
    policies?: MiddlewareType[]
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
        path?: string
        defaultLocale: string
    } | false
    /**
     * Forms
     * */
    forms?: {
        /**
         * You can add forms directly to adminpanel configuration or put them in files with
         * `.json` extension which should be named as form slug. Put your forms in your
         * directory and write down path to it in `path` field.
         */
        path?: string
        /**
         * same for model (need entity config types)
         * */
        data: {
            [key: string]: FieldsForms
        }
        /**
         * Custom getter
         * */
        get?: GetFunction
        /**
         * Custom setter
         * */
        set?: SetFunction
    }

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
     * Show adminpanel version on the bottom of navbar
     * */
    showVersion?: boolean

    /**
     *
     * System field for store absolute root path adminpanel hookfolder
     */
    rootPath?: string

    /**
     *  Navigation
     */
    navigation?: NavigationConfig

    mediamanager?: MediaManagerConfig

    /** System settings */
    system?: {
        /** Default ORM adapter for system models */
        defaultORM: string
    }

    bind?: {
        public: boolean
    }

    notifications?: {
        enabled: boolean
    }
    aiAssistant?: {
        enabled: boolean
        defaultModel?: string
        models?: string[]
    }
}

export interface ModelConfig {
    adapter?: string
    title: string
    /**
     * Model name
     * */
    model: string

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
     * Entity fields configuration
     * */
    fields?: FieldsModels
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
     * Entity actions displayed in left navbar for specific entity
     * */
    tools?: HrefConfig[]
    /**
     * Entity icon
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

export interface FieldsForms {
    [key: string]: FormFieldConfig
}

export type ModelFieldConfig = (BaseFieldConfig | TuiEditorFieldConfig) & { groupsAccessRights?: string[] }

export interface FieldsModels {
    [key: string]:
        boolean |
        string |
        ModelFieldConfig
}

interface FormFieldConfig extends BaseFieldConfig {
    value?: any
    required?: boolean
    description?: string
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
}

export interface TuiEditorFieldConfig extends BaseFieldConfig {
    type: 'tui' | 'tuieditor' | 'toast-ui'
    options: TuiEditorOptions
}

export interface MediaManagerOptionsField {
    id: 'default' | string
    group: string
    config?: Record<string, any>
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
     * */
    controller?: string
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

export interface NavigationItemTypeConfig {
    model: string
    title: string
    /**
     *  /page/${data.record.slug}
     */
    urlPath: string | ((v: any) => string)
}

export interface NavigationConfig {
    model?: string
    sections: string[]
    groupField: { name: string, required: boolean }[]
    allowContentInGroup?: boolean
    items: NavigationItemTypeConfig[],
    movingGroupsRootOnly?: boolean
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
