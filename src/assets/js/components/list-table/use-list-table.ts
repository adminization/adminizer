import {router, usePage} from '@inertiajs/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {HeaderConfig} from './types';

interface UseListTableOptions {
    header: HeaderConfig;
    initialCount?: string;
}

export interface QueryColumn {
    key: string;
    value: string;
}

export function useListTable({header, initialCount = '5'}: UseListTableOptions) {
    const page = usePage();
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [count, setCount] = useState(initialCount);
    const [sortColumn, setSortColumn] = useState('1');
    const [sortDirection, setSortDirection] = useState('desc');

    const queryColumnsRef = useRef<QueryColumn[]>([]);
    const lastActiveElementRef = useRef<{type: 'global' | 'column', columnIndex?: string} | null>(null);
    const [dataKey, setDataKey] = useState(0);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        setSearchValue(searchParams.get('globalSearch') || '');
        setShowSearch(!!searchParams.get('globalSearch'));
        setCurrentPage(parseInt(searchParams.get('page') || '1'));
        setCount(searchParams.get('count') || initialCount);
        setSortColumn(searchParams.get('column') || '1');
        setSortDirection(searchParams.get('direction') || 'desc');

        const searchColumns = searchParams.getAll('searchColumn');
        const searchValues = searchParams.getAll('searchColumnValue');
        queryColumnsRef.current = searchColumns.map((col, i) => ({
            key: col,
            value: searchValues[i]
        }));
    }, [initialCount]);  // ← Только при монтировании

    useEffect(() => {
        document.body.removeAttribute('style');
    }, []);

    // Restore focus after successful navigation
    useEffect(() => {
        if (lastActiveElementRef.current) {
            setTimeout(() => {
                if (lastActiveElementRef.current?.type === 'column' && lastActiveElementRef.current.columnIndex) {
                    // Focus column search input
                    const input = document.querySelector(`input[data-column-index="${lastActiveElementRef.current.columnIndex}"]`) as HTMLInputElement;
                    if (input) {
                        input.focus();
                        input.select();
                    }
                } else if (lastActiveElementRef.current?.type === 'global') {
                    // Focus global search input - find by being the first input in the search bar
                    const searchContainer = document.querySelector('.flex.gap-2.p-2');
                    if (searchContainer) {
                        const input = searchContainer.querySelector('input') as HTMLInputElement;
                        if (input) {
                            input.focus();
                            input.select();
                        }
                    }
                }
                lastActiveElementRef.current = null;
            }, 100);
        }
    }, [dataKey]);

    const navigate = useCallback((queryString: string, onlyFields: string[] = ['data', 'columns', 'header']) => {
        // Save the currently focused element
        if (document.activeElement instanceof HTMLElement) {
            const columnIndex = document.activeElement.getAttribute('data-column-index');
            if (columnIndex) {
                lastActiveElementRef.current = {type: 'column', columnIndex};
            } else if (document.activeElement.tagName === 'INPUT' && document.activeElement.hasAttribute('placeholder')) {
                lastActiveElementRef.current = {type: 'global'};
            }
        }
        
        setLoading(true);
        router.visit(`${header.entity.uri}?${queryString}`, {
            preserveState: true,
            only: onlyFields,
            onSuccess: () => {
                setLoading(false);
                setDataKey(prev => prev + 1);
            }
        });
    }, [header.entity.uri]);

    const buildQueryString = useCallback(
        (
            pageOverride?: number,
            initSortDirection?: string,
            initSortColumn?: string,
            initSearchValue?: string
        ) => {
            const pageToUse = pageOverride !== undefined ? pageOverride : currentPage;
            const initSortDir = initSortDirection !== undefined ? initSortDirection : sortDirection;
            const initSortCol = initSortColumn !== undefined ? initSortColumn : sortColumn;
            const initSearchVal = initSearchValue !== undefined ? initSearchValue : searchValue;

            // Получаем filterId из текущего URL
            const searchParams = new URLSearchParams(window.location.search);
            const filterId = searchParams.get('filterId');
            const filterIdParam = filterId ? `&filterId=${filterId}` : '';

            // Добавляем column и direction только если они отличаются от значений по умолчанию
            // По умолчанию sortColumn='1', sortDirection='desc'
            const hasCustomSort = initSortCol !== '1' || initSortDir !== 'desc';
            const sortParams = hasCustomSort ? `&column=${initSortCol}&direction=${initSortDir}` : '';

            const baseParams = `count=${count}&page=${pageToUse}`;
            const searchParam = initSearchVal ? `&globalSearch=${initSearchVal}` : '';
            const columnParams = queryColumnsRef.current
                .map(item => `&searchColumn=${item.key}&searchColumnValue=${item.value}`)
                .join('');

            return `${baseParams}${sortParams}${searchParam}${columnParams}${filterIdParam}`;
        },
        [count, currentPage, sortColumn, sortDirection, searchValue]
    );

    const changeCount = useCallback((newCount: string) => {
        setCount(newCount);
        setCurrentPage(1);
        // Сохраняем filterId при изменении count
        const searchParams = new URLSearchParams(window.location.search);
        const filterId = searchParams.get('filterId');
        const filterIdParam = filterId ? `&filterId=${filterId}` : '';
        navigate(`count=${newCount}&page=1${filterIdParam}`);
    }, [navigate]);

    const handlePageChange = useCallback((value: number) => {
        setCurrentPage(value);
        navigate(buildQueryString(value));
    }, [buildQueryString, navigate]);

    const handleCustomSort = useCallback((column: string, direction: string) => {
        setSortColumn(column);
        setSortDirection(direction);
        navigate(buildQueryString(undefined, direction, column));
    }, [buildQueryString, navigate]);

    const handleGlobalSearch = useCallback((value: string) => {
        setSearchValue(value);
        setCurrentPage(1);
    }, []);

    const handleSearch = useCallback(() => {
        navigate(buildQueryString(1));
    }, [buildQueryString, navigate]);

    const handleColumnSearch = useCallback((key: string, value: string) => {
        setCurrentPage(1);
        const existingIndex = queryColumnsRef.current.findIndex(item => item.key === key);
        if (existingIndex >= 0) {
            queryColumnsRef.current.splice(existingIndex, 1);
        }
        if (value) {
            queryColumnsRef.current.push({key, value});
        }
    }, []);

    const resetForm = useCallback(() => {
        setShowSearch(false);
        setSearchValue('');
        queryColumnsRef.current = [];
        setCurrentPage(1);
        setSortColumn('1');
        setSortDirection('desc');

        navigate(`count=${count}&page=1`);  // Сбрасываем filterId
    }, [count, navigate]);

    const toggleSearch = useCallback(() => {
        if (showSearch) {
            resetForm();
        } else {
            setShowSearch(true);
        }
    }, [showSearch, resetForm]);

    return {
        loading,
        searchValue,
        showSearch,
        currentPage,
        count,
        sortColumn,
        sortDirection,
        queryColumnsRef,
        changeCount,
        handlePageChange,
        handleCustomSort,
        handleGlobalSearch,
        handleSearch,
        handleColumnSearch,
        resetForm,
        toggleSearch,
        setSearchValue,
        setShowSearch,
        setCurrentPage,
        setCount,
        buildQueryString
    };
}
