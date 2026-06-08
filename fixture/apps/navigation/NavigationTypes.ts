export interface NavigationItemConfig {
    model: string;
    title: string;
    urlPath: string | ((value: any) => string);
}

export interface NavigationGroupField {
    name: string;
    required: boolean;
    label: string;
}

export interface NavigationAppConfig {
    model?: string;
    routePrefix?: string;
    componentFile?: string;
    devComponentUrl?: string;
    sections: string[];
    groupField: NavigationGroupField[];
    allowContentInGroup?: boolean;
    items: NavigationItemConfig[];
    movingGroupsRootOnly?: boolean;
    sync?: boolean;
}
