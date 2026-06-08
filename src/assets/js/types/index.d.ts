import {MenuItem} from "../../../helpers/menuHelper"
import {PropsFieldType} from "../../../helpers/inertiaAddHelper.ts"
import {INotification} from "../../../interfaces/types.ts";

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}


export interface Columns {
    [key: string]: {
        data: string
        title: string
        orderable?: boolean
        searchable?: boolean
        direction?: string
        searchColumnValue?: string
    }
}

export interface NavItem extends MenuItem {
    type: 'blank' | 'self';
    /**
     * Section grouping for navbar items (side navigation)
     */
    section?: string;
}

type FlashMessages = 'info' | 'error' | 'success' | string;

export interface SharedData {
    name: string;
    menu: NavItem[];
    brand: string,
    logout: string
    logoutBtn: string
    flash: Record<FlashMessages, string>;
    auth: Auth;
    notifications: boolean;
    history: boolean;
    i18n?: {
        locale?: string;
        common?: Record<string, string>;
        page?: Record<string, string>;
    };
    i18nPage?: Record<string, string>;
    aiAssistant?: {
        enabled: boolean;
        defaultModel: string | null;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    login: string;
    email: string;
    avatar?: string;
    isAdministrator: boolean;

    [key: string]: unknown;
}

export interface Widget {
    id: string;
    name: string;
    description: string;
    icon?: string;
    backgroundCSS?: string;
    type: WidgetType;
    api?: string;
    link?: string;
    linkType?: 'self' | 'blank'
    state?: boolean;
    scriptUrl?: string;
    constructorOption?: any;
    constructorName?: string;
    hideAdminPanelUI?: boolean;
    group?: string;
    size?: {
        w: number
        h: number
    }
    added?: boolean

    [key: string]: any;
}

export interface WidgetLayoutItem {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    id: string;
}

declare global {
    interface Window {
        routePrefix: string;
        bindPublic: boolean;
        adminApi: typeof import('@/lib/admin-api').adminApi;
        __adminizerAiAssistantState__?: {
            isOpen: boolean;
            activeModel?: string;
        };
    }
}

export interface Field {
    label: string;
    type: PropsFieldType;
    name: string;
    tooltip?: string;
    value: FieldValue;
    disabled?: boolean;
    required?: boolean;
    isIn?: string[] | object;
    options?: any;
    relatedModel?: string;
    canCreateRelated?: boolean;
}

export interface Catalog {
    catalogName: string,
    catalogId: string,
    catalogSlug: string,
    movingGroupsRootOnly: boolean,
    idList: string[],
    nodes: ModeModel[]
}

export interface CatalogTemplateComponentRecord {
    id: string;
    appName: string;
    catalog?: string | string[];
    catalogs: string[];
    type: string;
    component: string;
    exportName?: string;
    enabled: boolean;
}

export interface CatalogItem {
    actionHandlers: []
    allowedRoot: boolean
    urlPath: string
    type: string
    navigationModel: string
    name: string
    model: string
    isGroup: boolean
    icon: string
}

export interface CustomCatalogData {
    id: string | number;
    name: string;
    parentId: string | number | null;
    visible: undefined | boolean;
    isNavigation: boolean | undefined
    sortOrder: number
    icon: string
    type: string;
    marked?: boolean
    modelId: string | number
}

export interface AddCatalogProps {
    props: {
        actions: {
            link: string;
            id: string;
            title: string;
            icon: string;
        }[];
        notFound?: string
        search?: string,
        btnBack: {
            title: string;
            link: string;
        };
        fields: Field[];
        edit: boolean;
        view: boolean;
        btnSave: {
            title: string;
        },
        postLink: string,
    }
}

export interface DynamicComponent {
    default: FC<{
        parentId?: string | number
        callback: (item: any) => void
        item?: Record<string, any>
        update?: boolean
    }>;
}

export interface CatalogTemplateComponentProps {
    mode: 'create' | 'update';
    type: string;
    template: {
        type: string;
        data: any;
    };
    parentId: string | number;
    itemType: string | null;
    selectedItem?: Record<string, any>;
    messages: Record<string, string>;
    actions: {
        close: () => void;
        reload: (item?: any) => Promise<void>;
        openModelAdd: (model: string) => Promise<void>;
    };
}

export type CatalogTemplateComponentModule = {
    default?: FC<CatalogTemplateComponentProps>;
    [key: string]: FC<CatalogTemplateComponentProps> | undefined;
};

export interface DynamicActionComponent {
    default: FC<{
        items: any,
        callback: () => void
    }>;
}

export interface CatalogActions {
    type: string;
    displayTool: boolean;
    displayContext: boolean;
    selectedItemTypes: string[];
    id: string;
    icon: string;
    name: string
}


export interface Media {
    id: string,
    title: string,
    mimeType: string,
    variants: Media[]
    url: string,
    filename: string
    createdAt: string
    size: number
    tag: string
    meta: MediaMeta[]
}

export interface MediaMeta {
    id: string
    key: string
    value: string | Record<string, any>
    isPublic: boolean,
    createdAt: string
    updatedAt: string
    MediaManagerAPId: string
    parentId: null | string
}

export interface MediaProps {
    mediaList: Media[],
    messages: Record<string, string>,
    openMeta: (media: Media) => void
    crop: (media: Media) => void
    openVariant: (media: Media) => void
    destroy: (media: Media) => void
}

export interface NotificationProps {
    notifications: INotification[];
    onMarkAsRead: (notificationClass: string, id: string) => Promise<void>;
    loadingMore: boolean;
    onLoadMore: () => void;
    hasMore: boolean;
    messages: Record<string, string>
}
