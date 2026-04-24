import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {router, usePage} from '@inertiajs/react';
import axios from 'axios';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent,
    DialogStackDescription,
    DialogStackFooter,
    DialogStackHeader,
    DialogStackOverlay,
    DialogStackTitle,
} from '@/components/ui/dialog-stack.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Input} from '@/components/ui/input.tsx';
import {Textarea} from '@/components/ui/textarea.tsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.tsx';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover.tsx';
import {Calendar} from '@/components/ui/calendar.tsx';
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from '@/components/ui/command.tsx';
import {Checkbox} from '@/components/ui/checkbox.tsx';
import {Switch} from '@/components/ui/switch.tsx';
import {SavedFiltersList} from './filter-panel-saved-filters';
import {GroupVisibilitySelector} from './group-visibility-selector';
import {Plus, X, Save, Trash2, Play, Settings, Columns3, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Lock, Globe, Users} from 'lucide-react';
import MaterialIcon from '@/components/material-icon.tsx';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';
import { useFilterTranslations } from './use-filter-translations';

export interface ColumnConfig {
    fieldName: string;
    label: string;
    type: string;
    order: number;
}

export interface ActiveFilter {
    id: string;
    fieldId: string;
    relationField?: string;
    customHandler?: string;
    enabled: boolean;
    condition: string;
    value: string | number | boolean | Date | Record<string, any> | (string | number | Date)[];
}

export interface RelationFilterField {
    id: string;
    label: string;
    type: string;
    options?: {value: string | number; label: string}[];
}

export interface FilterField {
    id: string;
    label: string;
    type: string;
    options?: {value: string | number; label: string}[];
    isRelation?: boolean;
    relationFields?: RelationFilterField[];
    isCustomFilter?: boolean;
    customFilterHandlerId?: string;
    customFilterConditionLabel?: string;
    customFilterInputConfig?: Record<string, { placeholder: string; type?: 'text' | 'number' }>;
    required?: boolean;
}

type FilterConditionOption = { value: string; label: string };

interface FilterPanelProps {
    onApplyFilters?: (filters: ActiveFilter[]) => void;
}

interface TemporaryFilterMeta {
    name: string;
    conditionCount: number;
    isModified?: boolean;
}

interface TemporaryFilterPayload {
    name: string;
    conditions: any[];
    columns?: Array<{ fieldName: string; order: number }>;
}

const TEMPORARY_FILTER_ID = 'temporary';

const getRouteUrl = (url?: string) => {
    if (url) {
        return url;
    }

    if (typeof window === 'undefined') {
        return '/';
    }

    return `${window.location.pathname}${window.location.search}`;
};

const getUrlFromRoute = (url?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(getRouteUrl(url), origin);
};

const getModelNameFromPathname = (pathname: string) => {
    const pathParts = pathname.split('/');
    const entityIndex = pathParts.findIndex(p => p === 'model');
    return entityIndex !== -1 && entityIndex + 1 < pathParts.length
        ? pathParts[entityIndex + 1]
        : '';
};

const normalizeFilterId = (filterId: string | null) => {
    if (!filterId || filterId === 'null' || filterId === 'undefined') {
        return undefined;
    }

    return filterId;
};

const useFilterRouteState = (pageUrl?: string) => {
    const routeState = useMemo(() => {
        const url = getUrlFromRoute(pageUrl);
        return {
            modelName: getModelNameFromPathname(url.pathname),
            activeFilterId: normalizeFilterId(url.searchParams.get('filterId')),
            pathname: url.pathname,
            searchParams: url.searchParams,
        };
    }, [pageUrl]);

    const navigateWithFilterId = useCallback((filterId?: string) => {
        const url = getUrlFromRoute(pageUrl);

        if (filterId) {
            url.searchParams.set('filterId', filterId);
        } else {
            url.searchParams.delete('filterId');
        }

        router.get(url.pathname, Object.fromEntries(url.searchParams), {
            preserveState: true,
            preserveScroll: true
        });
    }, [pageUrl]);

    const clearActiveFilter = useCallback(() => {
        navigateWithFilterId(undefined);
    }, [navigateWithFilterId]);

    return {
        modelName: routeState.modelName,
        activeFilterId: routeState.activeFilterId,
        setActiveFilterId: navigateWithFilterId,
        clearActiveFilter,
    };
};

const getTemporaryFilterMeta = (data: any): TemporaryFilterMeta | null => {
    if (!data || typeof data !== 'object') {
        return null;
    }

    return {
        name: String(data.name || ''),
        conditionCount: typeof data.conditionCount === 'number'
            ? data.conditionCount
            : (Array.isArray(data.conditions) ? data.conditions.length : 0),
        isModified: Boolean(data.isModified),
    };
};

const getTemporaryFilterStorageKey = (modelName: string) => `temporaryFilter_${modelName}`;

const FILTER_ICON_OPTIONS = [
    'filter_alt',
    'bookmark',
    'star',
    'push_pin',
    'search',
    'bolt',
    'favorite',
    'local_offer',
    'list_alt',
    'tune',
] as const;

export function FilterPanel({onApplyFilters}: FilterPanelProps) {
    const page = usePage<any>();
    const user = page.props?.auth?.user;
    const activeFilterFromPage = page.props?.activeFilter;
    const {
        modelName,
        activeFilterId,
        setActiveFilterId,
        clearActiveFilter,
    } = useFilterRouteState(page.url);
    const { t } = useFilterTranslations(modelName);
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
    const [availableFields, setAvailableFields] = useState<FilterField[]>([]);
    const [tempFilterName, setTempFilterName] = useState<string>('');
    const [filterForEdit, setFilterForEdit] = useState<any>(null);
    const [selectValue, setSelectValue] = useState('placeholder');
    const [hasTemporaryFilter, setHasTemporaryFilter] = useState(false);
    const [temporaryFilterData, setTemporaryFilterData] = useState<TemporaryFilterMeta | null>(null);
    
    // Meta fields for saving filter
    const [saveMeta, setSaveMeta] = useState({
        name: '',
        description: '',
        icon: 'bookmark',
        color: '#3b82f6'
    });
    const [isNameDirty, setIsNameDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    // API access state
    const [userKey, setUserKey] = useState<string | undefined>(undefined);
    const [showUserKeyRequiredDialog, setShowUserKeyRequiredDialog] = useState(false);
    const [filterColumns, setFilterColumns] = useState<ColumnConfig[]>([]);
    const [columnsLoading, setColumnsLoading] = useState(false);
    const [columnsAvailable, setColumnsAvailable] = useState<ColumnConfig[]>([]);
    const [columnsVisible, setColumnsVisible] = useState<ColumnConfig[]>([]);
    const [columnsError, setColumnsError] = useState('');

    // Ref для основного DialogStack
    const filterDialogRef = useRef<any>(null);

    // Meta fields for editing saved filter
    const [editMeta, setEditMeta] = useState({
        name: '',
        description: '',
        icon: 'bookmark',
        color: '#3b82f6'
    });
    // Edit API access state
    const [editApiEnabled, setEditApiEnabled] = useState(false);
    const [editApiKey, setEditApiKey] = useState<string | undefined>(undefined);
    // Visibility states
    const [saveVisibility, setSaveVisibility] = useState<'private' | 'public' | 'groups'>('private');
    const [editVisibility, setEditVisibility] = useState<'private' | 'public' | 'groups'>('private');
    const [saveGroupIds, setSaveGroupIds] = useState<number[]>([]);
    const [editGroupIds, setEditGroupIds] = useState<number[]>([]);
    const [userGroups, setUserGroups] = useState<Array<{ id: number; name: string }>>([]);

    // Режим второго слайда: 'edit' | 'save' | 'columns'
    const [slide2Mode, setSlide2Mode] = useState<'edit' | 'save' | 'columns'>('edit');

    // ---- Функции для управления колонками ----
    const loadColumns = async () => {
        setColumnsLoading(true);
        setColumnsError('');

        try {
            // Для сохранённого фильтра используем его id, для временного - 'temporary'
            const filterId = filterForEdit?.id || (activeFilterId === TEMPORARY_FILTER_ID ? TEMPORARY_FILTER_ID : undefined);
            let url = `/adminizer/model/${modelName}/columns`;
            if (filterId) {
                url += `?filterId=${filterId}`;
            }
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                const { availableColumns: backendColumns, filterColumns: filterCols, hasFilterConfig } = data;

                if (hasFilterConfig && filterCols.length > 0) {
                    const columnsMap = new Map(backendColumns.map((col: ColumnConfig) => [col.fieldName, col]));
                    const visible: ColumnConfig[] = [];
                    const hidden: ColumnConfig[] = [];

                    const sortedFilterColumns = [...filterCols].sort((a, b) => a.order - b.order);
                    for (const filterCol of sortedFilterColumns) {
                        const baseCol = columnsMap.get(filterCol.fieldName);
                        if (baseCol) {
                            visible.push({ ...baseCol, order: filterCol.order });
                        }
                    }
                    for (const [fieldName, baseCol] of columnsMap) {
                        if (!visible.find(v => v.fieldName === fieldName)) {
                            hidden.push({ ...baseCol, order: visible.length + hidden.length });
                        }
                    }

                    setColumnsVisible(visible);
                    setColumnsAvailable(hidden);
                } else {
                    const allVisible = backendColumns.map((col: ColumnConfig, index: number) => ({ ...col, order: index }));
                    setColumnsVisible(allVisible);
                    setColumnsAvailable([]);
                }
            } else {
                setColumnsError(data.error || t('Error loading columns'));
            }
        } catch (err: any) {
            console.error('Error loading columns:', err);
            setColumnsError(t('Network error') + ': ' + err.message);
        } finally {
            setColumnsLoading(false);
        }
    };

    const handleOpenColumnsDialog = () => {
        setSlide2Mode('columns');
        loadColumns();
    };

    const handleSaveColumns = () => {
        const visibleColumns = columnsVisible.map((col, index) => ({ ...col, order: index }));
        setFilterColumns(visibleColumns);
        setSlide2Mode('edit');
    };

    const moveColumnToVisible = (column: ColumnConfig) => {
        setColumnsAvailable(prev => prev.filter(c => c.fieldName !== column.fieldName));
        setColumnsVisible(prev => [...prev, { ...column, order: prev.length }]);
    };

    const moveColumnToAvailable = (column: ColumnConfig) => {
        setColumnsVisible(prev => prev.filter(c => c.fieldName !== column.fieldName));
        setColumnsAvailable(prev => [...prev, { ...column, order: prev.length }]);
    };

    const moveAllColumnsToVisible = () => {
        setColumnsVisible(prev => [
            ...prev,
            ...columnsAvailable.map((col, index) => ({ ...col, order: prev.length + index }))
        ]);
        setColumnsAvailable([]);
    };

    const moveAllColumnsToAvailable = () => {
        setColumnsAvailable(prev => [
            ...prev,
            ...columnsVisible.map((col, index) => ({ ...col, order: prev.length + index }))
        ]);
        setColumnsVisible([]);
    };

    const moveColumnUp = (index: number) => {
        if (index === 0) return;
        setColumnsVisible(prev => {
            const newCols = [...prev];
            [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
            return newCols.map((col, i) => ({ ...col, order: i }));
        });
    };

    const moveColumnDown = (index: number) => {
        if (index >= columnsVisible.length - 1) return;
        setColumnsVisible(prev => {
            const newCols = [...prev];
            [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
            return newCols.map((col, i) => ({ ...col, order: i }));
        });
    };
    // ---- Конец функций для колонок ----

    // State для календарей в условиях фильтра
    const [fromOpen, setFromOpen] = useState(false);
    const [toOpen, setToOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const previousRouteStateRef = useRef<{modelName: string; activeFilterId?: string} | null>(null);
    const availableFieldsById = useMemo(
        () => new Map(availableFields.map((field) => [field.id, field])),
        [availableFields]
    );
    const activeFieldIds = useMemo(
        () => new Set(activeFilters.map((activeFilter) => activeFilter.fieldId)),
        [activeFilters]
    );

    useEffect(() => {
        const previous = previousRouteStateRef.current;
        const routeChanged = previous
            && (previous.modelName !== modelName || previous.activeFilterId !== activeFilterId);

        if (routeChanged && (!activeFilterId || previous?.modelName !== modelName)) {
            setActiveFilters([]);
            setTempFilterName('');
            setFilterForEdit(null);
            setSlide2Mode('edit');
        }

        previousRouteStateRef.current = {modelName, activeFilterId};
    }, [activeFilterId, modelName]);

    // Загрузка временного фильтра из sessionStorage при изменении URL/modelName
    useEffect(() => {
        if (!modelName) {
            setHasTemporaryFilter(false);
            setTemporaryFilterData(null);
            return;
        }

        const storageKey = getTemporaryFilterStorageKey(modelName);
        const stored = sessionStorage.getItem(storageKey);

        if (!stored) {
            const temporaryFilterFromPage = activeFilterId === TEMPORARY_FILTER_ID
                && activeFilterFromPage?.id === TEMPORARY_FILTER_ID
                ? activeFilterFromPage
                : null;

            if (temporaryFilterFromPage) {
                const meta = getTemporaryFilterMeta(temporaryFilterFromPage);
                setHasTemporaryFilter(Boolean(meta));
                setTemporaryFilterData(meta);
                setTempFilterName(meta?.name || '');

                if (meta) {
                    sessionStorage.setItem(storageKey, JSON.stringify(meta));
                }

                return;
            }

            setHasTemporaryFilter(false);
            setTemporaryFilterData(null);

            if (activeFilterId === TEMPORARY_FILTER_ID) {
                clearActiveFilter();
            }

            return;
        }

        try {
            const parsed = JSON.parse(stored);
            const meta = getTemporaryFilterMeta(parsed);

            if (!meta) {
                throw new Error('Invalid temporary filter metadata');
            }

            setTemporaryFilterData(meta);
            setTempFilterName(meta.name);
            setHasTemporaryFilter(true);

            if (Array.isArray(parsed.conditions)) {
                sessionStorage.setItem(storageKey, JSON.stringify(meta));
            }
        } catch (error) {
            console.error('Error loading temporary filter:', error);
            sessionStorage.removeItem(storageKey);
            setHasTemporaryFilter(false);
            setTemporaryFilterData(null);

            if (activeFilterId === TEMPORARY_FILTER_ID) {
                clearActiveFilter();
            }
        }
    }, [activeFilterFromPage, activeFilterId, clearActiveFilter, modelName]);

    // Загрузка полей для фильтрации с бэкенда
    useEffect(() => {
        const loadFilterFields = async () => {
            try {
                if (!modelName) {
                    console.error('Could not find entity in URL');
                    return;
                }

                const response = await axios.get(`/adminizer/model/${modelName}/filter-fields`);
                const data = response.data;
                setAvailableFields(data.fields || []);
            } catch (error) {
                console.error('Error loading filter fields:', error);
            }
        };

        loadFilterFields();
    }, [modelName]);

    // Загрузка всех групп (для админов)
    useEffect(() => {
        const loadGroups = async () => {
            if (!user?.isAdministrator) {
                return;
            }
            try {
                const response = await axios.get('/adminizer/groups');
                setUserGroups(response.data.groups || []);
            } catch (error) {
                console.error('Error loading groups:', error);
            }
        };

        loadGroups();
    }, [user?.isAdministrator]);

    // Экспортируем функции наружу через window для доступа из TableToolbar
    useEffect(() => {
        (window as any).adminizerFilterPanel = {
            openFilterDialog: () => openFilterDialog(),
            openSaveFilterDialog: () => handleOpenSaveDialog(),
            openEditCurrentFilter: (filterId?: string) => openEditCurrentFilter(filterId),
            getModelName: () => modelName,
            getActiveFilterId: () => activeFilterId,
            hasTemporaryFilter: () => hasTemporaryFilter
        };

        return () => {
            delete (window as any).adminizerFilterPanel;
        };
    }, [modelName, activeFilterId, hasTemporaryFilter]);

    /**
     * Открытие основного диалога фильтров
     */
    const openFilterDialog = () => {
        setSlide2Mode('edit'); // Сбрасываем режим
        filterDialogRef.current?.open();
    };

    /**
     * Open edit view for the active saved filter.
     */
    const openEditCurrentFilter = async (requestedFilterId?: string) => {
        const targetFilterId = requestedFilterId || activeFilterId;

        if (!targetFilterId || !modelName) {
            return;
        }

        if (targetFilterId === 'temporary') {
            handleEditTemporaryFilter();
            return;
        }

        setSlide2Mode('edit');
        filterDialogRef.current?.open();

        try {
            const response = await axios.get(`/adminizer/model/${modelName}/saved-filters`);
            const savedFilters = response.data?.filters || [];
            const targetFilter = savedFilters.find((filter: any) => String(filter.id) === String(targetFilterId));

            if (!targetFilter) {
                return;
            }

            handleEditFilter(targetFilter);
        } catch (error) {
            console.error('Error loading filter for edit:', error);
        }
    };

    const loadTemporaryFilterPayload = async (): Promise<TemporaryFilterPayload | null> => {
        if (!modelName) {
            return null;
        }

        if (activeFilterId === TEMPORARY_FILTER_ID && activeFilterFromPage?.id === TEMPORARY_FILTER_ID) {
            return {
                name: activeFilterFromPage.name,
                conditions: activeFilterFromPage.conditions || []
            };
        }

        try {
            const response = await axios.get(`/adminizer/model/${modelName}/filter/temporary`);
            const filter = response.data?.filter;

            if (!filter) {
                return null;
            }

            return {
                name: filter.name,
                conditions: filter.conditions || [],
                columns: filter.columns
            };
        } catch (error: any) {
            if (error.response?.status === 404) {
                sessionStorage.removeItem(getTemporaryFilterStorageKey(modelName));
                setHasTemporaryFilter(false);
                setTemporaryFilterData(null);
            } else {
                console.error('Error loading temporary filter:', error);
            }

            return null;
        }
    };

    /**
     * Редактирование временного фильтра
     */
    const handleEditTemporaryFilter = async () => {
        const currentTemporaryFilter = await loadTemporaryFilterPayload();

        if (currentTemporaryFilter) {
            const meta = getTemporaryFilterMeta(currentTemporaryFilter);
            setSlide2Mode('edit');
            setFilterForEdit(null);
            setTemporaryFilterData(meta);
            setTempFilterName(currentTemporaryFilter.name);
            loadFilterIntoPanel({conditions: currentTemporaryFilter.conditions});
            filterDialogRef.current?.open();
            requestAnimationFrame(() => {
                filterDialogRef.current?.next();
            });
        }
    };

    /**
     * Применение временного фильтра
     */
    const handleApplyTemporaryFilter = () => {
        setActiveFilterId(TEMPORARY_FILTER_ID);

        // Закрываем диалог
        filterDialogRef.current?.close();
        
        // Отправляем событие об изменении фильтра
        window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));
    };

    /**
     * Сохранение временного фильтра (переключает на 2 слайд в режиме save)
     */
    const handleSaveTemporaryFilter = async () => {
        if (activeFilters.length === 0) {
            const currentTemporaryFilter = await loadTemporaryFilterPayload();

            if (currentTemporaryFilter) {
                loadFilterIntoPanel({conditions: currentTemporaryFilter.conditions});
                const meta = getTemporaryFilterMeta(currentTemporaryFilter);
                setTemporaryFilterData(meta);
                setTempFilterName(currentTemporaryFilter.name);
            }
        }

        // Сбрасываем форму мета-данных
        setSaveMeta({
            name: '',
            description: '',
            icon: 'bookmark',
            color: '#3b82f6'
        });
        setSaveVisibility('private'); // По умолчанию приватный
        setSaveGroupIds([]);
        setIsNameDirty(false);
        setSaveError('');
        setSlide2Mode('save');
        loadUserApiKey(); // Load user API key when opening save dialog

        // Открываем второй слайд (в режиме сохранения)
        filterDialogRef.current?.next();
    };

    // ---- API helper functions ----
    const loadUserApiKey = async () => {
        if (userKey) return; // Already loaded
        try {
            const response = await axios.get('/adminizer/api/user-key');
            setUserKey(response.data.apiKey);
        } catch (error) {
            console.error('Failed to load user API key:', error);
        }
    };

    const getFeedBaseUrl = () => `${window.location.origin}/adminizer/api/feed`;

    // Edit mode API helpers
    const getEditJsonFeedUrl = () => `${getFeedBaseUrl()}/${editApiKey || '...'}.json?userKey=${userKey || '...'}`;
    const getEditXmlFeedUrl = () => `${getFeedBaseUrl()}/${editApiKey || '...'}.xml?userKey=${userKey || '...'}`;

    const copyEditToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} ${t('copied to clipboard')}`);
        } catch (err) {
            toast.error(t('Failed to copy'));
        }
    };

    // ---- End API helper functions ----

    const convertFilterValue = (value: any): any => {
        if (Array.isArray(value)) {
            return value.map(v => convertFilterValue(v));
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, convertFilterValue(v)])
            );
        }
        return value;
    };

    const isPlainObjectValue = useCallback((value: unknown): value is Record<string, any> => {
        return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
    }, []);

    const getCustomInputEntries = useCallback((field?: FilterField): Array<[string, { placeholder: string; type?: 'text' | 'number' }]> => {
        if (!field?.customFilterInputConfig) {
            return [];
        }

        return Object.entries(field.customFilterInputConfig).slice(0, 3);
    }, []);

    const getDefaultCustomFilterValue = useCallback((field: FilterField, prevValue: ActiveFilter['value']) => {
        const customEntries = getCustomInputEntries(field);
        if (customEntries.length === 0) {
            return isPlainObjectValue(prevValue) ? '' : (prevValue ?? '');
        }

        const prevObject = isPlainObjectValue(prevValue)
            ? prevValue
            : (customEntries.length === 1 && prevValue !== undefined && prevValue !== null
                ? { [customEntries[0][0]]: prevValue }
                : {});
        return Object.fromEntries(
            customEntries.map(([id]) => [id, prevObject[id] ?? ''])
        );
    }, [getCustomInputEntries, isPlainObjectValue]);

    const serializeFilterCondition = (filter: ActiveFilter) => {
        const convertedValue = convertFilterValue(filter.value);

        if (filter.customHandler && filter.condition === 'custom') {
            const field = availableFieldsById.get(filter.fieldId);
            return {
                id: filter.id,
                field: filter.fieldId,
                customHandler: filter.customHandler,
                customHandlerName: field?.customFilterConditionLabel,
                operator: 'custom',
                value: convertedValue
            };
        }

        return {
            id: filter.id,
            ...(filter.relationField
                ? {relation: filter.fieldId, relationField: filter.relationField}
                : {field: filter.fieldId}),
            operator: filter.condition,
            value: convertedValue
        };
    };

    /**
     * Сохранение фильтра (с мета-данными)
     */
    const handleSaveFilter = async () => {
        if (!saveMeta.name.trim()) {
            setSaveError(t('Enter filter name'));
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            const conditions = activeFilters
                .filter(f => f.enabled)
                .map(serializeFilterCondition);

            const payload: any = {
                name: saveMeta.name.trim(),
                description: saveMeta.description?.trim() || undefined,
                conditions,
                icon: saveMeta.icon || 'bookmark',
                color: saveMeta.color || '#3b82f6',
                visibility: saveVisibility,
                groupIds: saveVisibility === 'groups' ? saveGroupIds : undefined,
            };

            // Добавляем конфигурацию колонок
            if (filterColumns.length > 0) {
                payload.columns = filterColumns
                    .map((col, index) => ({
                        fieldName: col.fieldName,
                        order: index
                    }));
            }

            const response = await axios.post(`/adminizer/model/${modelName}/filter`, payload);
            const filter = response.data.filter;

            // Очищаем временный фильтр после успешного сохранения
            sessionStorage.removeItem(getTemporaryFilterStorageKey(modelName));
            setHasTemporaryFilter(false);
            setTemporaryFilterData(null);
            
            // Сбрасываем состояние
            setActiveFilters([]);
            setFilterForEdit(null);
            setTempFilterName('');

            // Возвращаемся на первый слайд
            setSlide2Mode('edit');
            filterDialogRef.current?.prev();

            // Отправляем событие об изменении фильтра (для обновления списка)
            window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));

            // Apply saved filter immediately using the same flow as the saved filters list
            handleApplySavedFilter({
                id: String(filter.id),
                name: filter.name || saveMeta.name.trim(),
                conditions: filter.conditions || conditions,
                icon: filter.icon,
                color: filter.color
            });

        } catch (error: any) {
            console.error('Error saving filter:', error);
            setSaveError(error.response?.data?.error || t('Error saving filter'));
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Сброс временного фильтра
     */
    const handleDiscardTemporaryFilter = () => {
        sessionStorage.removeItem(getTemporaryFilterStorageKey(modelName));
        setHasTemporaryFilter(false);
        setTemporaryFilterData(null);
        setTempFilterName('');
        setActiveFilters([]);

        window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));
        clearActiveFilter();
        
        filterDialogRef.current?.close();
    };

    /**
     * Загрузка условий фильтра в панель
     */
    const loadFilterIntoPanel = useCallback((filterData: {conditions: any[]}) => {
        const getFallbackFieldIdFromHandler = (handlerId?: string): string | undefined => {
            if (!handlerId) return undefined;
            const byHandler = availableFields.find(
                (field) => field.isCustomFilter && field.customFilterHandlerId === handlerId
            );
            if (byHandler) return byHandler.id;
            const parts = handlerId.split('.');
            return parts[parts.length - 1];
        };

        const getConditionFieldType = (cond: any, resolvedFieldId: string): string | undefined => {
            const baseField = availableFields.find((field) => field.id === resolvedFieldId);
            if (!baseField) return undefined;
            if (!baseField.isRelation) return baseField.type;

            const relationField = (baseField.relationFields || []).find(
                (rf) => rf.id === cond.relationField
            );
            return relationField?.type;
        };

        const parseConditionValue = (cond: any, resolvedFieldId: string): any => {
            const rawValue = cond.value;
            if (rawValue === undefined || rawValue === null) {
                return '';
            }

            if (cond.customHandler) {
                return rawValue;
            }

            const fieldType = getConditionFieldType(cond, resolvedFieldId);
            const isDateType = fieldType === 'date' || fieldType === 'datetime';
            if (!isDateType) {
                return rawValue;
            }

             // Keep month/year operators as plain strings for HTML inputs
            if (['month', 'year', 'monthBetween', 'yearBetween'].includes(cond.operator)) {
                if (Array.isArray(rawValue)) {
                    return rawValue.map((v: any) => (v === undefined || v === null ? '' : String(v)));
                }
                return String(rawValue);
            }

            if (Array.isArray(rawValue)) {
                return rawValue.map((v: any) => {
                    if (typeof v === 'string' && !isNaN(Date.parse(v))) {
                        return new Date(v);
                    }
                    return v;
                });
            }

            if (typeof rawValue === 'string' && !isNaN(Date.parse(rawValue))) {
                return new Date(rawValue);
            }

            return rawValue;
        };

        const loadedFilters: ActiveFilter[] = filterData.conditions.map((cond) => {
            const resolvedFieldId = cond.field || cond.relation || getFallbackFieldIdFromHandler(cond.customHandler) || '';
            const value = parseConditionValue(cond, resolvedFieldId);

            return {
                id: cond.id || `filter-${Date.now()}-${Math.random()}`,
                fieldId: resolvedFieldId,
                relationField: cond.relationField,
                customHandler: cond.customHandler,
                enabled: true,
                condition: cond.operator || (cond.customHandler ? 'custom' : 'eq'),
                value: (value === undefined || value === null) ? '' : value,
            };
        });

        setActiveFilters(loadedFilters);
    }, [availableFields]);

    /**
     * Применение фильтра (без сохранения)
     */
    const handleApplyFilters = async (filters: ActiveFilter[]) => {
        if (!modelName) {
            console.error('[FilterPanel] Model name is not set!');
            alert(t('Error') + ': ' + t('Model not found'));
            return;
        }
        
        try {
            const conditions = filters
                .filter(f => f.enabled)
                .map(serializeFilterCondition);

            const payload: any = {
                name: tempFilterName || t('Temporary filter'),
                conditions
            };

            // Добавляем конфигурацию колонок
            if (filterColumns.length > 0) {
                payload.columns = filterColumns
                    .map((col, index) => ({
                        fieldName: col.fieldName,
                        order: index
                    }));
            }

            // Отправляем POST запрос на применение временного фильтра
            const response = await axios.post(`/adminizer/model/${modelName}/filter/apply`, payload);
            const data = response.data;

            if (data.success) {
                // Сохраняем временные данные в sessionStorage с ключом модели
                sessionStorage.setItem(getTemporaryFilterStorageKey(modelName), JSON.stringify({
                    name: payload.name,
                    conditionCount: payload.conditions.length,
                    isModified: false
                }));

                // Обновляем состояние временного фильтра
                setTemporaryFilterData({
                    name: payload.name,
                    conditionCount: payload.conditions.length,
                    isModified: false
                });
                setHasTemporaryFilter(true);
                
                // Обновляем заголовок второго слайда
                setTempFilterName(payload.name);

                // Обновляем активные фильтры
                setActiveFilters(filters);
                setActiveFilterId(TEMPORARY_FILTER_ID);

                // Закрываем диалог
                filterDialogRef.current?.close();

                // Отправляем событие об изменении фильтра
                window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));
            }

        } catch (error: any) {
            console.error('[FilterPanel] Error applying filter:', error);
            
            if (error.response?.status === 401) {
                console.error('Session expired, redirecting to login...');
                window.location.href = '/adminizer/model/userap/login';
                return;
            }
            
            alert(t('Error applying filter') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    /**
     * Сохранение изменений сохранённого фильтра (мета + условия)
     */
    const handleUpdateSavedFilter = async () => {
        if (!editMeta.name.trim()) {
            setSaveError(t('Enter filter name'));
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            const conditions = activeFilters
                .filter(f => f.enabled)
                .map(serializeFilterCondition);

            const payload: any = {
                filterId: filterForEdit.id,
                name: editMeta.name.trim(),
                description: editMeta.description?.trim() || undefined,
                conditions,
                icon: editMeta.icon || 'bookmark',
                color: editMeta.color || '#3b82f6',
                visibility: editVisibility,
                groupIds: editVisibility === 'groups' ? editGroupIds : undefined,
                sortField: filterForEdit.sortField,
                sortDirection: filterForEdit.sortDirection,
            };

            if (editVisibility === 'private') {
                payload.apiEnabled = editApiEnabled;
                payload.regenerateApiKey = editApiEnabled && !editApiKey;
            }

            // Добавляем конфигурацию колонок
            if (filterColumns.length > 0) {
                payload.columns = filterColumns
                    .map((col, index) => ({
                        fieldName: col.fieldName,
                        order: index
                    }));
            }

            const response = await axios.post(`/adminizer/model/${modelName}/filter`, payload);
            const filter = response.data.filter;

            // Обновляем состояние
            setTempFilterName(filter.name);
            setFilterForEdit(null);
            
            // Сбрасываем активные фильтры
            setActiveFilters([]);

            // Возвращаемся на первый слайд
            setSlide2Mode('edit');
            filterDialogRef.current?.prev();

            // Отправляем событие об изменении фильтра (для обновления списка)
            window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));

            // Apply updated saved filter immediately
            handleApplySavedFilter({
                id: String(filter.id),
                name: filter.name || editMeta.name.trim(),
                conditions: filter.conditions || conditions,
                icon: filter.icon,
                color: filter.color
            });

        } catch (error: any) {
            console.error('Error updating filter:', error);
            setSaveError(error.response?.data?.error || t('Error saving filter'));
        } finally {
            setIsSaving(false);
        }
    };
    const handleApplySavedFilter = useCallback((filter: {
        id: string;
        name: string;
        conditions: any[];
        icon?: string;
        color?: string;
    }) => {
        setActiveFilterId(filter.id);
        setTempFilterName(filter.name);

        // Загружаем условия в панель (для возможного редактирования)
        loadFilterIntoPanel({conditions: filter.conditions});

        // Отправляем событие об изменении фильтра
        window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));
    }, [loadFilterIntoPanel, setActiveFilterId]);

    /**
     * Сброс фильтра
     */
    const handleResetFilter = useCallback(() => {
        setActiveFilters([]);
        setTempFilterName('');
        
        // Отправляем событие об изменении фильтра
        window.dispatchEvent(new CustomEvent('adminizer:filterChanged'));
        clearActiveFilter();
    }, [clearActiveFilter]);

    /**
     * Редактирование фильтра
     */
    const handleEditFilter = useCallback((filter: {
        id: string;
        name: string;
        description?: string;
        conditions: any[];
        icon?: string;
        color?: string;
        apiEnabled?: boolean;
        apiKey?: string;
        visibility?: string;
        groupIds?: number[];
    }) => {
        setFilterForEdit(filter);
        setTempFilterName(filter.name);
        setEditMeta({
            name: filter.name,
            description: filter.description || '',
            icon: filter.icon || 'bookmark',
            color: filter.color || '#3b82f6'
        });
        setEditVisibility((filter.visibility as 'private' | 'public' | 'groups') || 'private');
        setEditGroupIds(filter.groupIds || []);
        setEditApiEnabled(filter.apiEnabled || false);
        setEditApiKey(filter.apiKey || undefined);
        loadUserApiKey(); // Ensure user API key is loaded
        loadFilterIntoPanel({conditions: filter.conditions});
        setSlide2Mode('edit');
        // Открываем второй слайд (редактирование сохранённого фильтра с метаполя ми)
        filterDialogRef.current?.next();
    }, [loadFilterIntoPanel]);

    /**
     * Удаление фильтра
     */
    const handleDeleteFilter = useCallback((filterId: string) => {
        if (activeFilterId === filterId) {
            handleResetFilter();
        }
    }, [activeFilterId, handleResetFilter]);

    const getCurrentMonthValue = () => {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${now.getFullYear()}-${month}`;
    };

    const getCurrentYearValue = () => String(new Date().getFullYear());

    const getDefaultValueForCondition = (
        condition: string,
        prevValue: ActiveFilter['value'],
        field?: FilterField
    ) => {
        if (condition === 'custom' && field?.isCustomFilter) {
            return getDefaultCustomFilterValue(field, prevValue);
        }

        if (isPlainObjectValue(prevValue)) {
            return '';
        }

        if (condition === 'isNull' || condition === 'isNotNull' || condition === 'today') {
            return '';
        }

        if (condition === 'between') {
            return Array.isArray(prevValue) && prevValue.length === 2 ? prevValue : ['', ''];
        }

        if (condition === 'month') {
            return typeof prevValue === 'string' && /^\d{4}-\d{2}$/.test(prevValue) ? prevValue : getCurrentMonthValue();
        }

        if (condition === 'year') {
            if (typeof prevValue === 'string' && /^\d{4}$/.test(prevValue)) return prevValue;
            if (typeof prevValue === 'number') return String(prevValue);
            return getCurrentYearValue();
        }

        if (condition === 'monthBetween') {
            if (
                Array.isArray(prevValue) &&
                prevValue.length === 2 &&
                typeof prevValue[0] === 'string' &&
                /^\d{4}-\d{2}$/.test(prevValue[0]) &&
                typeof prevValue[1] === 'string' &&
                /^\d{4}-\d{2}$/.test(prevValue[1])
            ) {
                return prevValue;
            }
            const currentMonth = getCurrentMonthValue();
            return [currentMonth, currentMonth];
        }

        if (condition === 'yearBetween') {
            const isYear = (v: any) =>
                (typeof v === 'string' && /^\d{4}$/.test(v)) || typeof v === 'number';

            if (Array.isArray(prevValue) && prevValue.length === 2 && isYear(prevValue[0]) && isYear(prevValue[1])) {
                return [String(prevValue[0]), String(prevValue[1])];
            }

            const currentYear = getCurrentYearValue();
            return [currentYear, currentYear];
        }

        return prevValue;
    };

    /**
     * Изменение условия
     */
    const handleFilterChange = useCallback((filterId: string, updates: Partial<ActiveFilter>) => {
        setActiveFilters((currentFilters) => currentFilters.map(f =>
            f.id === filterId ? {...f, ...updates} : f
        ));
        
        // Помечаем временный фильтр как изменённый
        if (hasTemporaryFilter) {
            setTemporaryFilterData((currentTemporaryFilter) => currentTemporaryFilter ? {
                ...currentTemporaryFilter,
                isModified: true
            } : currentTemporaryFilter);
        }
    }, [hasTemporaryFilter]);

    /**
     * Добавление условия
     */
    const handleAddFilter = useCallback((fieldId: string) => {
        if (activeFieldIds.has(fieldId)) {
            setSelectValue('placeholder');
            return;
        }

        const field = availableFieldsById.get(fieldId);
        if (!field) return;

        const defaultCondition = field.isCustomFilter ? 'custom' : 'eq';
        const defaultValue = defaultCondition === 'custom'
            ? getDefaultCustomFilterValue(field, '')
            : '';

        const newFilter: ActiveFilter = {
            id: Date.now().toString(),
            fieldId,
            relationField: field.isRelation ? field.relationFields?.[0]?.id : undefined,
            customHandler: field.isCustomFilter ? field.customFilterHandlerId : undefined,
            enabled: true,
            condition: defaultCondition,
            value: defaultValue,
        };
        const newFilters = [...activeFilters, newFilter];
        setActiveFilters(newFilters);
        setSelectValue('placeholder');
        
        // Помечаем временный фильтр как изменённый
        if (hasTemporaryFilter) {
            setTemporaryFilterData((currentTemporaryFilter) => currentTemporaryFilter ? {
                ...currentTemporaryFilter,
                conditionCount: newFilters.length,
                isModified: true
            } : currentTemporaryFilter);
        }
    }, [activeFieldIds, activeFilters, availableFieldsById, getDefaultCustomFilterValue, hasTemporaryFilter]);

    /**
     * Удаление условия
     */
    const handleRemoveFilter = useCallback((filterId: string) => {
        setActiveFilters((currentFilters) => {
            const newFilters = currentFilters.filter(f => f.id !== filterId);

            if (hasTemporaryFilter) {
                setTemporaryFilterData((currentTemporaryFilter) => currentTemporaryFilter ? {
                    ...currentTemporaryFilter,
                    conditionCount: newFilters.length,
                    isModified: true
                } : currentTemporaryFilter);
            }

            return newFilters;
        });
    }, [hasTemporaryFilter]);

    /**
     * Закрытие диалога и сброс
     */
    const handleCloseDialog = useCallback(() => {
        filterDialogRef.current?.close();
        setFilterForEdit(null);
    }, []);

    const getEffectiveFieldForInput = useCallback((filter: ActiveFilter, field: FilterField): FilterField | null => {
        if (!field.isRelation) {
            return field;
        }

        if (!field.relationFields || field.relationFields.length === 0) {
            return null;
        }

        const selectedRelationField = field.relationFields.find(rf => rf.id === filter.relationField) || field.relationFields[0];
        return {
            id: selectedRelationField.id,
            label: selectedRelationField.label,
            type: selectedRelationField.type,
            options: selectedRelationField.options,
            isCustomFilter: false,
        };
    }, []);

    const defaultConditionOptions = useMemo<FilterConditionOption[]>(() => [
        {value: 'eq', label: t('Equal')},
        {value: 'neq', label: t('Not equal')},
        {value: 'like', label: t('Contains')},
        {value: 'startsWith', label: t('Starts with')},
        {value: 'endsWith', label: t('Ends with')},
        {value: 'isNull', label: t('Is empty')},
        {value: 'isNotNull', label: t('Is not empty')},
    ], [t]);

    const conditionOptionsByFieldId = useMemo(() => {
        const optionsByFieldId = new Map<string, FilterConditionOption[]>();

        availableFields.forEach((field) => {
            if (field.isRelation) {
                optionsByFieldId.set(field.id, [
                    {value: 'eq', label: t('Equal')},
                    {value: 'neq', label: t('Not equal')},
                ]);
                return;
            }

            let conditions: FilterConditionOption[] = [];

            switch (field.type) {
                case 'number':
                case 'integer':
                case 'float':
                    conditions = [
                        {value: 'eq', label: t('Equal')},
                        {value: 'neq', label: t('Not equal')},
                        {value: 'gt', label: t('Greater than')},
                        {value: 'gte', label: t('Greater or equal')},
                        {value: 'lt', label: t('Less than')},
                        {value: 'lte', label: t('Less or equal')},
                        {value: 'between', label: t('Between')},
                        {value: 'isNull', label: t('Is empty')},
                        {value: 'isNotNull', label: t('Is not empty')},
                    ];
                    break;
                case 'date':
                case 'datetime':
                    conditions = [
                        {value: 'eq', label: t('Equal')},
                        {value: 'neq', label: t('Not equal')},
                        {value: 'gt', label: t('After')},
                        {value: 'gte', label: t('After or equal')},
                        {value: 'lt', label: t('Before')},
                        {value: 'lte', label: t('Before or equal')},
                        {value: 'between', label: t('Between')},
                        {value: 'today', label: t('Today')},
                        {value: 'month', label: t('Month')},
                        {value: 'year', label: t('Year')},
                        {value: 'monthBetween', label: t('Month range')},
                        {value: 'yearBetween', label: t('Year range')},
                        {value: 'isNull', label: t('Is empty')},
                        {value: 'isNotNull', label: t('Is not empty')},
                    ];
                    break;
                case 'boolean':
                    conditions = [
                        {value: 'eq', label: t('Equal')},
                        {value: 'neq', label: t('Not equal')},
                        {value: 'isNull', label: t('Is empty')},
                        {value: 'isNotNull', label: t('Is not empty')},
                    ];
                    break;
                case 'select':
                case 'select-many':
                case 'association':
                case 'association-many':
                    conditions = [
                        {value: 'eq', label: t('Equal')},
                        {value: 'neq', label: t('Not equal')},
                        {value: 'in', label: t('In list')},
                        {value: 'notIn', label: t('Not in list')},
                        {value: 'isNull', label: t('Is empty')},
                        {value: 'isNotNull', label: t('Is not empty')},
                    ];
                    break;
                case 'json':
                case 'jsoneditor':
                case 'object':
                case 'array':
                    conditions = [
                        {value: 'isNull', label: t('Is empty')},
                        {value: 'isNotNull', label: t('Is not empty')},
                    ];
                    break;
                default:
                    conditions = [...defaultConditionOptions];
                    break;
            }

            if (field.isCustomFilter && field.customFilterHandlerId) {
                conditions = [
                    ...conditions,
                    {
                        value: 'custom',
                        label: field.customFilterConditionLabel || t('Custom filtering'),
                    },
                ];
            }

            optionsByFieldId.set(field.id, conditions);
        });

        return optionsByFieldId;
    }, [availableFields, defaultConditionOptions, t]);

    // Условия для разных типов полей
    const getConditionsForField = useCallback((fieldId: string) => {
        return conditionOptionsByFieldId.get(fieldId) || defaultConditionOptions;
    }, [conditionOptionsByFieldId, defaultConditionOptions]);

    const fieldsAvailableToAdd = useMemo(() => (
        availableFields.filter((field) => !activeFieldIds.has(field.id))
    ), [activeFieldIds, availableFields]);

    // Рендер значения условия в зависимости от типа поля
    const renderValueInput = useCallback((filter: ActiveFilter, field: FilterField) => {
        if (field.isCustomFilter && filter.condition === 'custom') {
            const customEntries = getCustomInputEntries(field);

            if (customEntries.length > 0) {
                const customValue = isPlainObjectValue(filter.value)
                    ? filter.value
                    : (customEntries.length === 1 && filter.value !== undefined && filter.value !== null
                        ? { [customEntries[0][0]]: filter.value }
                        : {});
                return (
                    <div className="flex gap-1 flex-wrap">
                        {customEntries.map(([id, inputConfig]) => (
                            <Input
                                key={id}
                                type={inputConfig.type || 'text'}
                                value={String(customValue[id] ?? '')}
                                onChange={(e) => handleFilterChange(filter.id, {
                                    value: {
                                        ...customValue,
                                        [id]: e.target.value,
                                    }
                                })}
                                placeholder={inputConfig.placeholder || id}
                                className="w-full sm:w-[150px] h-9"
                            />
                        ))}
                    </div>
                );
            }

            return (
                <Input
                    type="text"
                    value={String(filter.value ?? '')}
                    onChange={(e) => handleFilterChange(filter.id, {value: e.target.value})}
                    placeholder={t('Value...')}
                    className="w-full sm:w-[220px] h-9"
                />
            );
        }

        if (filter.condition === 'isNull' || filter.condition === 'isNotNull' || filter.condition === 'today') {
            return null;
        }

        // Для boolean - селект с true/false
        if (field.type === 'boolean') {
            return (
                <Select
                    value={filter.value === true ? 'true' : filter.value === false ? 'false' : ''}
                    onValueChange={(value) => handleFilterChange(filter.id, {value: value === 'true' ? true : value === 'false' ? false : null})}
                >
                    <SelectTrigger className="w-full sm:w-[120px] h-9" size="sm">
                        <SelectValue placeholder={t('Select...')}/>
                    </SelectTrigger>
                    <SelectContent className="z-[1100]">
                        <SelectItem value="true">{t('Yes')}</SelectItem>
                        <SelectItem value="false">{t('No')}</SelectItem>
                    </SelectContent>
                </Select>
            );
        }

        // Для числовых типов - инпут с поддержкой операторов
        if (field.type === 'number' || field.type === 'integer' || field.type === 'float') {
            // Для between показываем два инпута
            if (filter.condition === 'between') {
                const valueArray = Array.isArray(filter.value) ? filter.value : ['', ''];
                return (
                    <div className="flex gap-1 flex-wrap">
                        <Input
                            type="number"
                            value={valueArray[0] as number | string}
                            onChange={(e) => handleFilterChange(filter.id, {
                                value: [parseFloat(e.target.value) || '', valueArray[1]]
                            })}
                            placeholder={t('From...')}
                            className="w-full sm:w-[120px] h-9"
                        />
                        <span className="flex items-center text-muted-foreground">-</span>
                        <Input
                            type="number"
                            value={valueArray[1] as number | string}
                            onChange={(e) => handleFilterChange(filter.id, {
                                value: [valueArray[0], parseFloat(e.target.value) || '']
                            })}
                            placeholder={t('To...')}
                            className="w-full sm:w-[120px] h-9"
                        />
                    </div>
                );
            }
            // Для остальных условий - один инпут
            return (
                <Input
                    type="number"
                    value={filter.value as number | string}
                    onChange={(e) => handleFilterChange(filter.id, { value: parseFloat(e.target.value) || '' })}
                    placeholder={t('Value...')}
                    className="w-full sm:w-[150px] h-9"
                />
            );
        }

        // Для date
        if ((field.type === 'date' || field.type === 'datetime') && filter.condition === 'month') {
            return (
                <Input
                    type="month"
                    value={typeof filter.value === 'string' ? filter.value : ''}
                    onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                    className="w-full sm:w-[160px] h-9"
                />
            );
        }

        if ((field.type === 'date' || field.type === 'datetime') && filter.condition === 'year') {
            return (
                <Input
                    type="number"
                    min={1900}
                    max={9999}
                    step={1}
                    value={typeof filter.value === 'string' || typeof filter.value === 'number' ? filter.value : ''}
                    onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                    placeholder={t('Year')}
                    className="w-full sm:w-[130px] h-9"
                />
            );
        }

        if ((field.type === 'date' || field.type === 'datetime') && filter.condition === 'monthBetween') {
            const valueArray = Array.isArray(filter.value) ? filter.value : ['', ''];
            return (
                <div className="flex gap-1 flex-wrap">
                    <Input
                        type="month"
                        value={typeof valueArray[0] === 'string' ? valueArray[0] : ''}
                        onChange={(e) => handleFilterChange(filter.id, { value: [e.target.value, valueArray[1]] })}
                        className="w-full sm:w-[160px] h-9"
                    />
                    <span className="flex items-center text-muted-foreground">-</span>
                    <Input
                        type="month"
                        value={typeof valueArray[1] === 'string' ? valueArray[1] : ''}
                        onChange={(e) => handleFilterChange(filter.id, { value: [valueArray[0], e.target.value] })}
                        className="w-full sm:w-[160px] h-9"
                    />
                </div>
            );
        }

        if ((field.type === 'date' || field.type === 'datetime') && filter.condition === 'yearBetween') {
            const valueArray = Array.isArray(filter.value) ? filter.value : ['', ''];
            return (
                <div className="flex gap-1 flex-wrap">
                    <Input
                        type="number"
                        min={1900}
                        max={9999}
                        step={1}
                        value={typeof valueArray[0] === 'string' || typeof valueArray[0] === 'number' ? valueArray[0] : ''}
                        onChange={(e) => handleFilterChange(filter.id, { value: [e.target.value, valueArray[1]] })}
                        placeholder={t('From...')}
                        className="w-full sm:w-[120px] h-9"
                    />
                    <span className="flex items-center text-muted-foreground">-</span>
                    <Input
                        type="number"
                        min={1900}
                        max={9999}
                        step={1}
                        value={typeof valueArray[1] === 'string' || typeof valueArray[1] === 'number' ? valueArray[1] : ''}
                        onChange={(e) => handleFilterChange(filter.id, { value: [valueArray[0], e.target.value] })}
                        placeholder={t('To...')}
                        className="w-full sm:w-[120px] h-9"
                    />
                </div>
            );
        }

        if (field.type === 'date') {
            // Для between показываем два календаря
            if (filter.condition === 'between') {
                const valueArray = Array.isArray(filter.value) ? filter.value : ['', ''];
                const from = valueArray[0];
                const to = valueArray[1];
                return (
                    <div className="flex gap-1 flex-wrap">
                        <Popover open={fromOpen} onOpenChange={setFromOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 w-[140px] justify-start text-left font-normal">
                                    {from && from instanceof Date ? format(from, 'dd.MM.yyyy', { locale: ru }) : t('From...')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={from instanceof Date ? from : undefined}
                                    onSelect={(date: Date | undefined) => {
                                        handleFilterChange(filter.id, { value: [date || '', to] as (string | Date)[] });
                                        setFromOpen(false);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <span className="flex items-center text-muted-foreground">-</span>
                        <Popover open={toOpen} onOpenChange={setToOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 w-[140px] justify-start text-left font-normal">
                                    {to && to instanceof Date ? format(to, 'dd.MM.yyyy', { locale: ru }) : t('To...')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={to instanceof Date ? to : undefined}
                                    onSelect={(date: Date | undefined) => {
                                        handleFilterChange(filter.id, { value: [from, date || ''] as (string | Date)[] });
                                        setToOpen(false);
                                    }}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            }
            // Для остальных условий - один календарь
            return (
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-[150px] justify-start text-left font-normal">
                            {filter.value && filter.value instanceof Date
                                ? format(filter.value, 'dd.MM.yyyy', { locale: ru })
                                : t('Date...')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filter.value instanceof Date ? filter.value : undefined}
                            onSelect={(date: Date | undefined) => {
                                handleFilterChange(filter.id, { value: date || '' });
                                setDateOpen(false);
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            );
        }

        // Для month/week - HTML5 input
        if (field.type === 'month' || field.type === 'week') {
            return (
                <Input
                    type={field.type}
                    value={filter.value as string || ''}
                    onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                    className="w-full sm:w-[150px] h-9"
                />
            );
        }

        // Для datetime - HTML5 datetime-local input
        if (field.type === 'datetime') {
            // Для between показываем два datetime-local инпута
            if (filter.condition === 'between') {
                const valueArray = Array.isArray(filter.value) ? filter.value : ['', ''];
                return (
                    <div className="flex gap-1 flex-wrap">
                        <Input
                            type="datetime-local"
                            value={valueArray[0] as string || ''}
                            onChange={(e) => handleFilterChange(filter.id, { value: [e.target.value, valueArray[1]] })}
                            className="w-full sm:w-[180px] h-9"
                        />
                        <span className="flex items-center text-muted-foreground">-</span>
                        <Input
                            type="datetime-local"
                            value={valueArray[1] as string || ''}
                            onChange={(e) => handleFilterChange(filter.id, { value: [valueArray[0], e.target.value] })}
                            className="w-full sm:w-[180px] h-9"
                        />
                    </div>
                );
            }
            // Для остальных условий - один datetime-local инпут
            return (
                <Input
                    type="datetime-local"
                    value={filter.value as string || ''}
                    onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                    className="w-full sm:w-[180px] h-9"
                />
            );
        }

        // Для time - HTML5 time input
        if (field.type === 'time') {
            return (
                <Input
                    type="time"
                    value={filter.value as string || ''}
                    onChange={(e) => handleFilterChange(filter.id, { value: e.target.value })}
                    className="w-full sm:w-[150px] h-9"
                />
            );
        }

        // Для select (мультиселект через Command)
        if (field.type === 'select' && filter.condition === 'in') {
            const selectedValues = Array.isArray(filter.value) ? filter.value : [filter.value].filter(Boolean);
            return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-[180px] justify-start">
                            {selectedValues.length === 0
                                ? t('Select...')
                                : `${selectedValues.length} ${t('selected')}`}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={t('Search...')} className="h-8" />
                            <CommandList>
                                <CommandEmpty>{t('No results')}</CommandEmpty>
                                <CommandGroup>
                                    {field.options?.map((option) => {
                                        const isSelected = selectedValues.includes(option.value);
                                        return (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => {
                                                    const newValues = isSelected
                                                        ? selectedValues.filter(v => v !== option.value)
                                                        : [...selectedValues, option.value];
                                                    handleFilterChange(filter.id, { value: newValues });
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    className="mr-2 [&_svg]:!text-primary-foreground"
                                                />
                                                {option.label}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            );
        }

        // Для select-many (мультиселект через Command)
        if (field.type === 'select-many' && filter.condition === 'in') {
            const selectedValues = Array.isArray(filter.value) ? filter.value : [filter.value].filter(Boolean);
            return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-[180px] justify-start">
                            {selectedValues.length === 0
                                ? t('Select...')
                                : `${selectedValues.length} ${t('selected')}`}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={t('Search...')} className="h-8" />
                            <CommandList>
                                <CommandEmpty>{t('No results')}</CommandEmpty>
                                <CommandGroup>
                                    {field.options?.map((option) => {
                                        const isSelected = selectedValues.includes(option.value);
                                        return (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => {
                                                    const newValues = isSelected
                                                        ? selectedValues.filter(v => v !== option.value)
                                                        : [...selectedValues, option.value];
                                                    handleFilterChange(filter.id, { value: newValues });
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    className="mr-2 [&_svg]:!text-primary-foreground"
                                                />
                                                {option.label}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            );
        }

        // Для select (одиночный выбор)
        if (field.type === 'select') {
            return (
                <Select
                    value={filter.value as string}
                    onValueChange={(value) => handleFilterChange(filter.id, { value })}
                >
                    <SelectTrigger className="w-full sm:w-[180px] h-9" size="sm">
                        <SelectValue placeholder={t('Select...')}/>
                    </SelectTrigger>
                    <SelectContent className="z-[1100]">
                        {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        // Для select-many (не in) - мультиселект через Command
        if (field.type === 'select-many') {
            const selectedValues = Array.isArray(filter.value) ? filter.value : [filter.value].filter(Boolean);
            return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-[180px] justify-start">
                            {selectedValues.length === 0
                                ? t('Select...')
                                : `${selectedValues.length} ${t('selected')}`}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={t('Search...')} className="h-8" />
                            <CommandList>
                                <CommandEmpty>{t('No results')}</CommandEmpty>
                                <CommandGroup>
                                    {field.options?.map((option) => {
                                        const isSelected = selectedValues.includes(option.value);
                                        return (
                                            <CommandItem
                                                key={option.value}
                                                value={option.value}
                                                onSelect={() => {
                                                    const newValues = isSelected
                                                        ? selectedValues.filter(v => v !== option.value)
                                                        : [...selectedValues, option.value];
                                                    handleFilterChange(filter.id, { value: newValues });
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    className="mr-2 [&_svg]:!text-primary-foreground"
                                                />
                                                {option.label}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            );
        }

        // По умолчанию - текстовый инпут
        return (
            <Input
                value={String(filter.value)}
                onChange={(e) => handleFilterChange(filter.id, {value: e.target.value})}
                placeholder={t('Value...')}
                className="w-full sm:w-[200px] h-9"
            />
        );
    }, [
        dateOpen,
        fromOpen,
        getCustomInputEntries,
        handleFilterChange,
        isPlainObjectValue,
        t,
        toOpen,
    ]);

    return (
        <>
            {/* Основной DialogStack с каскадными диалогами */}
            <DialogStack ref={filterDialogRef}>
                <DialogStackOverlay/>
                <DialogStackBody>
                    {/* Первый диалог: список сохранённых фильтров */}
                    <DialogStackContent className="w-[95vw] sm:w-[90vw] max-w-none">
                        <div className="relative h-full">
                            <div className="h-full overflow-y-auto mt-5 pr-2 sm:pr-5">
                                <DialogStackHeader>
                                    <DialogStackTitle>
                                        {t('Filters')}
                                    </DialogStackTitle>
                                    <DialogStackDescription>
                                        {activeFilterId && activeFilterId !== TEMPORARY_FILTER_ID
                                            ? t('Select a filter or create a new one')
                                            : t('Select a saved filter or create a new one')}
                                    </DialogStackDescription>
                                </DialogStackHeader>

                                <div className="space-y-4 py-4">
                            {/* Кнопка создания нового фильтра */}
                            <Button
                                onClick={() => {
                                    setFilterForEdit(null);
                                    setActiveFilters([]);
                                    setTempFilterName(t('New filter'));
                                    filterDialogRef.current?.next();
                                }}
                                className="w-full"
                                variant="outline"
                            >
                                <Plus className="h-4 w-4 mr-2"/>
                                {t('Add filter')}
                            </Button>

                            {/* Временный фильтр (активный) */}
                            {hasTemporaryFilter && temporaryFilterData && (
                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-muted-foreground px-2">
                                        {t('Active filter')}
                                    </div>
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 rounded-md border bg-accent/50 border-accent">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">📝</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">
                                                    {temporaryFilterData.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {temporaryFilterData.conditionCount} {t('conditions')}
                                                    {temporaryFilterData.isModified && ` (${t('modified')})`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={handleApplyTemporaryFilter}
                                                title={t('Apply filter')}
                                            >
                                                <Play className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={handleEditTemporaryFilter}
                                                title={t('Edit')}
                                            >
                                                <Settings className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={handleSaveTemporaryFilter}
                                                title={t('Save')}
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                onClick={handleDiscardTemporaryFilter}
                                                title={t('Reset filter')}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Список сохранённых фильтров */}
                            {modelName && (
                                <>
                                    {!hasTemporaryFilter && (
                                        <div className="text-xs font-medium text-muted-foreground px-2">
                                            {t('Saved filters')}
                                        </div>
                                    )}
                                    <SavedFiltersList
                                        modelName={modelName}
                                        activeFilterId={activeFilterId}
                                        onApplyFilter={handleApplySavedFilter}
                                        onEditFilter={handleEditFilter}
                                        onDeleteFilter={handleDeleteFilter}
                                        user={user}
                                    />
                                </>
                            )}

                            {/* Кнопка сброса активного фильтра */}
                            {activeFilterId && activeFilterId !== TEMPORARY_FILTER_ID && (
                                <div className="pt-4 border-t">
                                    <Button
                                        onClick={handleResetFilter}
                                        variant="destructive"
                                        className="w-full"
                                    >
                                        <X className="h-4 w-4 mr-2"/>
                                        {t('Reset filter')}
                                    </Button>
                                </div>
                            )}
                                </div>
                            </div>
                        </div>
                    </DialogStackContent>

                    {/* Второй слайд: универсальный (редактирование / сохранение / колонки) */}
                    <DialogStackContent className="w-[95vw] sm:w-[90vw] max-w-none">
                        <div className="relative h-full">
                            <div className="h-full overflow-y-auto mt-5 pr-2 sm:pr-5">
                                {slide2Mode === 'columns' ? (
                                    /* === Настройка колонок === */
                                    <>
                                        <DialogStackHeader>
                                            <DialogStackTitle>{t('Columns settings')}</DialogStackTitle>
                                            <DialogStackDescription>
                                                {t('Select and arrange columns to display in the table')}
                                            </DialogStackDescription>
                                        </DialogStackHeader>

                                        {columnsLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <p className="text-sm text-muted-foreground">{t('Loading columns...')}</p>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {/* Левый блок - доступные */}
                                                    <div className="flex flex-col h-[400px]">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h3 className="text-sm font-medium">{t('Available columns')}</h3>
                                                            {columnsAvailable.length > 0 && (
                                                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={moveAllColumnsToVisible}>
                                                                    {t('Add all')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 border rounded-md overflow-y-auto p-1 bg-muted/10">
                                                            {columnsAvailable.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground text-center py-8">{t('No available columns')}</p>
                                                            ) : (
                                                                columnsAvailable.map((col) => (
                                                                    <div key={col.fieldName} className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted/50 rounded-sm group">
                                                                        <span className="truncate" title={col.label}>{col.label}</span>
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={() => moveColumnToVisible(col)}>
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Правый блок - видимые */}
                                                    <div className="flex flex-col h-[400px]">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h3 className="text-sm font-medium">{t('Visible columns')}</h3>
                                                            {columnsVisible.length > 0 && (
                                                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={moveAllColumnsToAvailable}>
                                                                    {t('Hide all')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 border rounded-md overflow-y-auto p-1 bg-muted/10">
                                                            {columnsVisible.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground text-center py-8">{t('Move columns here')}</p>
                                                            ) : (
                                                                columnsVisible.map((col, index) => (
                                                                    <div key={col.fieldName} className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted/50 rounded-sm group">
                                                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                            <div className="flex flex-shrink-0 gap-0.5">
                                                                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={index === 0} onClick={() => moveColumnUp(index)}>
                                                                                    <ChevronUp className="h-3 w-3" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={index === columnsVisible.length - 1} onClick={() => moveColumnDown(index)}>
                                                                                    <ChevronDown className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                            <span className="truncate" title={col.label}>{col.label}</span>
                                                                        </div>
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={() => moveColumnToAvailable(col)}>
                                                                            <ChevronLeft className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-muted-foreground mt-3 text-center">
                                                    {t('Use buttons')} ← → {t('to move and')} ↑ ↓ {t('to change order')}
                                                </p>

                                                {columnsError && (
                                                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mt-3">
                                                        {columnsError}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <DialogStackFooter className="mt-8 pb-4">
                                            <div className="flex flex-wrap items-center gap-2 w-full">
                                                <Button variant="outline" onClick={() => setSlide2Mode('edit')}>
                                                    {t('Back')}
                                                </Button>
                                                <div className="flex-1" />
                                                <Button onClick={handleSaveColumns}>
                                                    {t('Save')}
                                                </Button>
                                            </div>
                                        </DialogStackFooter>
                                    </>
                                ) : (
                                    <>
                                    <DialogStackHeader>
                                    <DialogStackTitle>
                                        {slide2Mode === 'edit'
                                            ? (filterForEdit ? `${t('Edit filter')}: ${tempFilterName}` : tempFilterName || t('New filter'))
                                            : t('Save filter')}
                                    </DialogStackTitle>
                                    <DialogStackDescription>
                                        {slide2Mode === 'edit'
                                            ? (filterForEdit ? t('Change filter conditions and parameters') : t('Configure filter conditions'))
                                            : t('Specify name and parameters for saving')}
                                    </DialogStackDescription>
                                </DialogStackHeader>

                                {slide2Mode === 'edit' ? (
                                    /* === РЕЖИМ РЕДАКТИРОВАНИЯ === */
                                    <div className="space-y-4 py-4">
                                {/* Метаполя - показываем только для сохранённого фильтра */}
                                {filterForEdit && (
                                    <div className="space-y-4 border-b pb-4">
                                        <h3 className="text-sm font-medium">{t('Filter parameters')}</h3>

                                        {/* Название */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                {t('Name')} <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                value={editMeta.name}
                                                onChange={(e) => setEditMeta({...editMeta, name: e.target.value})}
                                                placeholder={t('Enter filter name')}
                                            />
                                        </div>

                                        {/* Описание */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">{t('Description')}</label>
                                            <Textarea
                                                value={editMeta.description}
                                                onChange={(e) => setEditMeta({...editMeta, description: e.target.value})}
                                                placeholder={t('Description')}
                                                rows={2}
                                            />
                                        </div>

                                        {/* Visibility переключатель (только для админов) */}
                                        {user?.isAdministrator ? (
                                            <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{t('Filter visibility')}</span>
                                                </div>

                                                {/* Проверка: является ли текущий пользователь владельцем */}
                                                {(() => {
                                                    const filterOwnerId = filterForEdit?.ownerId || filterForEdit?.ownerInfo?.id;
                                                    const isOwner = filterOwnerId === user?.id;
                                                    
                                                    if (!isOwner) {
                                                        // Чужой фильтр - показываем информацию о владельце и блокируем
                                                        const ownerName = filterForEdit?.ownerInfo?.fullName || filterForEdit?.ownerInfo?.login || t('Unknown');
                                                        return (
                                                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                                                <div className="flex items-start gap-2">
                                                                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                                                    <div>
                                                                        <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                                                            {t("Someone else's private filter")}
                                                                        </div>
                                                                        <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                                                            {t('Owner')}: {ownerName}
                                                                        </div>
                                                                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                                            {t("You cannot change someone else's filter visibility")}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Свой фильтр - показываем радиокнопки для изменения
                                                    return (
                                                        <>
                                                            {/* Радиокнопки видимости */}
                                                            <div className="space-y-2">
                                                                <label
                                                                    className={cn(
                                                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                                                        editVisibility === 'private' && "bg-accent"
                                                                    )}
                                                                    onClick={() => setEditVisibility('private')}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name="editVisibility"
                                                                        checked={editVisibility === 'private'}
                                                                        onChange={() => setEditVisibility('private')}
                                                                        className="h-4 w-4"
                                                                    />
                                                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                                                    <div>
                                                                        <div className="text-sm font-medium">{t('Private')}</div>
                                                                        <div className="text-xs text-muted-foreground">{t('Only for you')}</div>
                                                                    </div>
                                                                </label>

                                                                <label
                                                                    className={cn(
                                                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                                                        editVisibility === 'groups' && "bg-accent"
                                                                    )}
                                                                    onClick={() => setEditVisibility('groups')}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name="editVisibility"
                                                                        checked={editVisibility === 'groups'}
                                                                        onChange={() => setEditVisibility('groups')}
                                                                        className="h-4 w-4"
                                                                    />
                                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                                    <div>
                                                                        <div className="text-sm font-medium">{t('For groups')}</div>
                                                                        <div className="text-xs text-muted-foreground">{t('For selected groups')}</div>
                                                                    </div>
                                                                </label>

                                                                <label
                                                                    className={cn(
                                                                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                                                        editVisibility === 'public' && "bg-accent"
                                                                    )}
                                                                    onClick={() => setEditVisibility('public')}
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name="editVisibility"
                                                                        checked={editVisibility === 'public'}
                                                                        onChange={() => setEditVisibility('public')}
                                                                        className="h-4 w-4"
                                                                    />
                                                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                                                    <div>
                                                                        <div className="text-sm font-medium">{t('Public')}</div>
                                                                        <div className="text-xs text-muted-foreground">{t('For all users')}</div>
                                                                    </div>
                                                                </label>
                                                            </div>

                                                            {/* Выбор групп (показывается только если выбран режим groups) */}
                                                            {editVisibility === 'groups' && userGroups.length > 0 && (
                                                                <div className="pt-2 border-t">
                                                                    <GroupVisibilitySelector
                                                                        groups={userGroups}
                                                                        selectedGroupIds={editGroupIds}
                                                                        onGroupsChange={setEditGroupIds}
                                                                        modelName={modelName}
                                                                    />
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            // Для обычных пользователей - показываем текущую видимость фильтра
                                            editVisibility === 'groups' ? (
                                                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-sm font-medium">{t('For groups')}</div>
                                                        <div className="text-xs text-muted-foreground">{t('Visible only to your group')}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-sm font-medium">{t('Private filter')}</div>
                                                        <div className="text-xs text-muted-foreground">{t('Visible only to you')}</div>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* Иконка и цвет в одну строку */}
                                        <div className="flex gap-4">
                                            {/* Иконка */}
                                            <div className="space-y-2 flex-1">
                                                <label className="text-sm font-medium">{t('Icon')}</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {[...FILTER_ICON_OPTIONS, ''].map((iconName) => (
                                                        <Button
                                                            key={iconName || 'none'}
                                                            variant={editMeta.icon === iconName ? 'default' : 'outline'}
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => setEditMeta({...editMeta, icon: iconName})}
                                                        >
                                                            {iconName
                                                                ? <MaterialIcon name={iconName} className="!text-[18px]" />
                                                                : <X className="h-4 w-4" />}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Цвет */}
                                            <div className="space-y-2 flex-1">
                                                <label className="text-sm font-medium">{t('Color')}</label>
                                                <div className="flex gap-1 flex-wrap">
                                                    {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((colorOption) => (
                                                        <Button
                                                            key={colorOption}
                                                            variant={editMeta.color === colorOption ? 'default' : 'outline'}
                                                            size="sm"
                                                            className="h-8 w-8 p-0 rounded-full"
                                                            style={{backgroundColor: editMeta.color === colorOption ? colorOption : 'transparent'}}
                                                            onClick={() => setEditMeta({...editMeta, color: colorOption})}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* API Access Section (edit mode) - only for private filters */}
                                        {filterForEdit && editVisibility === 'private' && (
                                            <div className="border rounded-lg p-3 bg-muted/20 mt-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={editApiEnabled}
                                                            onCheckedChange={(checked) => {
                                                                if (checked && !userKey) {
                                                                    setShowUserKeyRequiredDialog(true);
                                                                    setEditApiEnabled(false);
                                                                    return;
                                                                }

                                                                setEditApiEnabled(checked);
                                                                if (checked && !editApiKey) {
                                                                    setEditApiKey(crypto.randomUUID());
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-sm font-medium">{t('API access (feed)')}</span>
                                                    </div>
                                                </div>

                                            {editApiEnabled && editApiKey && (
                                                <div className="flex items-center gap-2 pt-3 border-t mt-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyEditToClipboard(getEditJsonFeedUrl(), t('JSON URL'))}
                                                    >
                                                        JSON
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyEditToClipboard(getEditXmlFeedUrl(), t('XML URL'))}
                                                    >
                                                        XML
                                                    </Button>
                                                </div>
                                            )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Условия фильтра */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium">
                                        {filterForEdit ? t('Filter conditions') : t('Add condition')}
                                    </h3>

                                    {/* Добавление условия */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{t('Add')}:</span>
                                        <div className="w-full sm:w-auto">
                                            <Select value={selectValue} onValueChange={(value) => {
                                                if (value !== 'placeholder') {
                                                    handleAddFilter(value);
                                                }
                                            }} disabled={fieldsAvailableToAdd.length === 0}>
                                                <SelectTrigger className="w-full sm:w-[200px] h-8" size="sm">
                                                    <SelectValue placeholder={t('Select field')}/>
                                                </SelectTrigger>
                                                <SelectContent className="z-[1100]">
                                                    <SelectItem value="placeholder" disabled className="text-muted-foreground">
                                                        {fieldsAvailableToAdd.length === 0 ? t('No results') : t('Select field')}
                                                    </SelectItem>
                                                    {fieldsAvailableToAdd
                                                        .map((field) => (
                                                            <SelectItem key={field.id} value={field.id}>
                                                                {field.label}
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                {/* Список условий */}
                                {activeFilters.length > 0 && (
                                    <div className="space-y-2">
                                        {activeFilters.map((filter) => {
                                            const field = availableFieldsById.get(filter.fieldId);
                                            if (!field) return null;
                                            const conditions = getConditionsForField(filter.fieldId);
                                            const effectiveField = getEffectiveFieldForInput(filter, field);

                                            return (
                                                <div key={filter.id}
                                                     className="flex flex-col items-stretch gap-2 p-2 border rounded-md bg-muted/30 sm:flex-row sm:items-center">
                                                    <span className="text-sm font-medium sm:min-w-[120px] truncate"
                                                          title={field.label}>
                                                        {field.label}
                                                    </span>

                                                    {field.isRelation && (
                                                        <Select
                                                            value={filter.relationField || ''}
                                                            onValueChange={(value) => handleFilterChange(filter.id, {
                                                                relationField: value,
                                                                value: ''
                                                            })}
                                                        >
                                                            <SelectTrigger className="w-full sm:w-[200px] h-9" size="sm">
                                                                <SelectValue placeholder={t('Select field')}/>
                                                            </SelectTrigger>
                                                            <SelectContent className="z-[1100]">
                                                                {(field.relationFields || []).map((relationField) => (
                                                                    <SelectItem key={relationField.id} value={relationField.id}>
                                                                        {relationField.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}

                                                    <Select value={filter.condition}
                                                            onValueChange={(value) => handleFilterChange(filter.id, {
                                                                condition: value,
                                                                value: getDefaultValueForCondition(value, filter.value, field)
                                                            })}>
                                                        <SelectTrigger className="w-full sm:w-[180px] h-9" size="sm">
                                                            <SelectValue/>
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[1100]">
                                                            {conditions.map((cond) => (
                                                                <SelectItem key={cond.value} value={cond.value}>
                                                                    {cond.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <div className="w-full sm:flex-1">
                                                        {effectiveField ? renderValueInput(filter, effectiveField) : null}
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 self-end sm:self-auto sm:ml-auto"
                                                        onClick={() => handleRemoveFilter(filter.id)}
                                                    >
                                                        <X className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {activeFilters.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        {t('No conditions. Add a condition above.')}
                                    </p>
                                )}
                            </div>
                            </div>
                        ) : (
                            /* === РЕЖИМ СОХРАНЕНИЯ (МЕТА-ДАННЫЕ) === */
                            <div className="space-y-4 py-4">
                                {/* Название */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {t('Name')} <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        value={saveMeta.name}
                                        onChange={(e) => {
                                            setSaveMeta({...saveMeta, name: e.target.value});
                                            setIsNameDirty(true);
                                        }}
                                        placeholder={t('Enter filter name')}
                                        autoFocus
                                    />
                                    {saveError && !saveMeta.name.trim() && (
                                        <p className="text-xs text-destructive">{saveError}</p>
                                    )}
                                </div>

                                {/* Описание */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('Description')}</label>
                                    <Textarea
                                        value={saveMeta.description}
                                        onChange={(e) => setSaveMeta({...saveMeta, description: e.target.value})}
                                        placeholder={t('Description')}
                                        rows={2}
                                    />
                                </div>

                                {/* Visibility переключатель (только для админов) */}
                                {user?.isAdministrator ? (
                                    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{t('Filter visibility')}</span>
                                        </div>

                                        {/* Радиокнопки видимости */}
                                        <div className="space-y-2">
                                            <label
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                                    saveVisibility === 'private' && "bg-accent"
                                                )}
                                                onClick={() => setSaveVisibility('private')}
                                            >
                                                <input
                                                    type="radio"
                                                    name="saveVisibility"
                                                    checked={saveVisibility === 'private'}
                                                    onChange={() => setSaveVisibility('private')}
                                                    className="h-4 w-4"
                                                />
                                                <Lock className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-sm font-medium">{t('Private')}</div>
                                                    <div className="text-xs text-muted-foreground">{t('Only for you')}</div>
                                                </div>
                                            </label>

                                            <label
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                                    saveVisibility === 'groups' && "bg-accent"
                                                )}
                                                onClick={() => setSaveVisibility('groups')}
                                            >
                                                <input
                                                    type="radio"
                                                    name="saveVisibility"
                                                    checked={saveVisibility === 'groups'}
                                                    onChange={() => setSaveVisibility('groups')}
                                                    className="h-4 w-4"
                                                />
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-sm font-medium">{t('For groups')}</div>
                                                    <div className="text-xs text-muted-foreground">{t('For selected groups')}</div>
                                                </div>
                                            </label>

                                            <label
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                                    saveVisibility === 'public' && "bg-accent"
                                                )}
                                                onClick={() => setSaveVisibility('public')}
                                            >
                                                <input
                                                    type="radio"
                                                    name="saveVisibility"
                                                    checked={saveVisibility === 'public'}
                                                    onChange={() => setSaveVisibility('public')}
                                                    className="h-4 w-4"
                                                />
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="text-sm font-medium">{t('Public')}</div>
                                                    <div className="text-xs text-muted-foreground">{t('For all users')}</div>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Выбор групп (показывается только если выбран режим groups) */}
                                        {saveVisibility === 'groups' && userGroups.length > 0 && (
                                            <div className="pt-2 border-t">
                                                <GroupVisibilitySelector
                                                    groups={userGroups}
                                                    selectedGroupIds={saveGroupIds}
                                                    onGroupsChange={setSaveGroupIds}
                                                    modelName={modelName}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Для обычных пользователей - только приватный
                                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-sm font-medium">{t('Private filter')}</div>
                                            <div className="text-xs text-muted-foreground">{t('Visible only to you')}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Иконка и цвет в одну строку */}
                                <div className="flex gap-4">
                                    {/* Иконка */}
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">{t('Icon')}</label>
                                        <div className="flex gap-1 flex-wrap">
                                            {[...FILTER_ICON_OPTIONS, ''].map((iconName) => (
                                                <Button
                                                    key={iconName || 'none'}
                                                    variant={saveMeta.icon === iconName ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setSaveMeta({...saveMeta, icon: iconName})}
                                                >
                                                    {iconName
                                                        ? <MaterialIcon name={iconName} className="!text-[18px]" />
                                                        : <X className="h-4 w-4" />}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Цвет */}
                                    <div className="space-y-2 flex-1">
                                        <label className="text-sm font-medium">{t('Color')}</label>
                                        <div className="flex gap-1 flex-wrap">
                                            {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((colorOption) => (
                                                <Button
                                                    key={colorOption}
                                                    variant={saveMeta.color === colorOption ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-full"
                                                    style={{backgroundColor: saveMeta.color === colorOption ? colorOption : 'transparent'}}
                                                    onClick={() => setSaveMeta({...saveMeta, color: colorOption})}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Ошибка */}
                                {saveError && saveMeta.name.trim() && (
                                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                        {saveError}
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogStackFooter className="mt-8 pb-4">
                            {slide2Mode === 'edit' ? (
                                <div className="flex flex-wrap items-center gap-2 w-full">
                                    <Button variant="outline" onClick={handleCloseDialog} disabled={activeFilters.length === 0}>
                                        {t('Cancel')}
                                    </Button>
                                    {/* Кнопка «Колонки» */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleOpenColumnsDialog}
                                    >
                                        <Columns3 className="h-4 w-4" />
                                        {t('Columns')}
                                    </Button>
                                    <div className="flex-1" />
                                    {filterForEdit ? (
                                        <Button onClick={handleUpdateSavedFilter} disabled={isSaving || !editMeta.name.trim()}>
                                            {isSaving ? t('Saving...') : t('Save changes')}
                                        </Button>
                                    ) : (
                                        <Button onClick={() => handleApplyFilters(activeFilters)} disabled={activeFilters.length === 0}>
                                            {t('Apply')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2 w-full">
                                    <Button variant="outline" onClick={() => {
                                        setSlide2Mode('edit');
                                    }} disabled={isSaving}>
                                        {t('Back')}
                                    </Button>
                                    {/* Кнопка «Колонки» */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={handleOpenColumnsDialog}
                                    >
                                        <Columns3 className="h-4 w-4" />
                                        {t('Columns')}
                                    </Button>
                                    <div className="flex-1" />
                                    <Button onClick={handleSaveFilter} disabled={isSaving || !saveMeta.name.trim()}>
                                        {isSaving ? t('Saving...') : t('Save')}
                                    </Button>
                                </div>
                            )}
                        </DialogStackFooter>
                                </>
                                )}
                            </div>
                        </div>
                    </DialogStackContent>
                </DialogStackBody>
            </DialogStack>

            {/* User API Key Required Dialog */}
            {showUserKeyRequiredDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-2">{t('API key is not created')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('The key is not created. Create it or contact an administrator.')}
                        </p>
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setShowUserKeyRequiredDialog(false)}>
                                {t('OK')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}









