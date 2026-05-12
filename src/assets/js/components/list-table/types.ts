import {SharedData} from '@/types';

export type ListPageSize = 5 | 20 | 50;

export interface Action {
    id: string;
    title: string;
    icon: string;
    type: 'blank' | 'self';
    link: string;
}

export interface CrudActions {
    createTitle: string;
    editTitle: string;
    viewsTitle: string;
    deleteTitle: string;
}

export interface DelModal {
    yes: string;
    no: string;
    text: string;
}

export interface HeaderConfig {
    actions: Action[];
    inlineActions: Action[];
    thActionsTitle: string;
    crudActions: CrudActions;
    entity: {
        name: string;
        uri: string;
    };
    notFoundContent: string;
    searchBtn: string;
    resetBtn: string;
    delModal: DelModal;
    filtersEnabled?: boolean;
    activeFilterName?: string;
    activeFilterConditions?: any[];
    activeFilter?: {
        id: string;
        name: string;
        conditions?: any[];
        icon?: string;
        color?: string;
    };
    defaultPageSize: ListPageSize;
    pageSizeOptions: ListPageSize[];
}

export interface ListTableData {
    data: any[];
    recordsTotal: number;
    recordsFiltered: number;
    page: number;
}

export interface FilterColumnConfig {
    fieldName: string;
    order: number;
}

export interface ExtendedSharedData extends SharedData {
    data: ListTableData;
    columns: any;
    header: HeaderConfig;
    customColumns?: FilterColumnConfig[] | null;
}
