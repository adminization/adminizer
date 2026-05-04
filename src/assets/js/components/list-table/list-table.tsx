import {usePage} from '@inertiajs/react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {DataTable} from '@/components/table/data-table';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select.tsx';
import {Toaster} from '@/components/ui/sonner';
import {toast} from 'sonner';
import {generatePagination} from '@/lib/pagination.ts';
import PaginationRender from '@/components/pagination-render.tsx';
import {useTableColumns} from '@/components/table/columns';
import {useListTable} from './use-list-table';
import {TableToolbar} from './table-toolbar';
import {createActionsColumn} from './actions-column';
import {ExtendedSharedData} from './types';
import {usePersistedColumnVisibility} from './use-persisted-column-visibility';
import {useFilterTranslations} from './use-filter-translations';

const ListTable = () => {
    const page = usePage<ExtendedSharedData>();
    const initialData = page.props.data;
    const header = page.props.header;
    const customColumns = page.props.customColumns;
    const {t} = useFilterTranslations(header.entity.name);

    // Store table data in state for inline updates
    const [tableData, setTableData] = useState(initialData.data);

    // Update local data when page data changes (e.g., pagination)
    useEffect(() => {
        setTableData(initialData.data);
    }, [initialData.data]);

    // Callback to update a single record after inline edit
    const updateRecord = useCallback((recordId: any, fieldName: string, newValue: any) => {
        setTableData(prevData => {
            return prevData.map(record => {
                if (record.id === recordId) {
                    return { ...record, [fieldName]: newValue };
                }
                return record;
            });
        });
    }, []);

    const {
        loading,
        searchValue,
        showSearch,
        currentPage: hookCurrentPage,
        count,
        changeCount,
        handlePageChange,
        handleCustomSort,
        handleGlobalSearch,
        handleSearch,
        handleColumnSearch,
        toggleSearch
    } = useListTable({header});

    // Используем currentPage из initialData (с бэкенда), а не из хука
    const currentPage = initialData.page || hookCurrentPage;

    const pagination = useMemo(() => {
        return generatePagination(
            initialData.recordsFiltered,
            parseInt(count),
            currentPage,
            5
        );
    }, [initialData.recordsFiltered, count, currentPage, searchValue]);

    useEffect(() => {
        if (page.props.flash) {
            if (page.props.flash.success) {
                toast.success(page.props.flash.success);
            }
            if (page.props.flash.error) {
                toast.error(page.props.flash.error);
            }
        }
    }, [page.props.flash]);

    const dynamicColumns = useTableColumns(
        page.props.columns,
        header.entity.name,
        updateRecord,
        handleCustomSort,
        handleColumnSearch,
        handleSearch,
        showSearch && !header.filtersEnabled
    );

    const tableColumns = useMemo(() => {
        const actionsColumn = createActionsColumn({
            thActionsTitle: header.thActionsTitle,
            crudActions: header.crudActions,
            inlineActions: header.inlineActions,
            entityUri: header.entity.uri,
            entityName: header.entity.name,
            delModal: header.delModal
        });

        let columns = [actionsColumn, ...dynamicColumns];

        // Применяем customColumns если есть
        if (customColumns && customColumns.length > 0) {
            // Создаём мап видимых колонок по order
            const visibleColumnsMap = new Map(
                customColumns
                    .sort((a, b) => a.order - b.order)
                    .map(col => [col.fieldName, col])
            );

            // Фильтруем и переупорядочиваем колонки
            const filteredColumns = dynamicColumns.filter(col => {
                // Actions column всегда видна
                if (col.accessorKey === 'actions') return true;
                // Проверяем, есть ли колонка в видимых
                return visibleColumnsMap.has(col.accessorKey as string);
            });

            // Сортируем согласно order из customColumns
            filteredColumns.sort((a, b) => {
                const orderA = visibleColumnsMap.get(a.accessorKey as string)?.order ?? 999;
                const orderB = visibleColumnsMap.get(b.accessorKey as string)?.order ?? 999;
                return orderA - orderB;
            });

            columns = [actionsColumn, ...filteredColumns];
        }

        return columns;
    }, [
        header.thActionsTitle,
        header.crudActions,
        header.inlineActions,
        header.entity.uri,
        header.entity.name,
        header.delModal,
        dynamicColumns,
        customColumns
    ]);

    const {
        columnVisibility,
        onColumnVisibilityChange
    } = usePersistedColumnVisibility(header.entity.name, tableColumns);

    return (
        <>
            <Toaster position="top-center" richColors closeButton/>
            <div className={`flex h-auto flex-1 flex-col gap-4 rounded-xl p-4 ${loading ? 'opacity-50' : ''}`}>
                <TableToolbar
                    header={header}
                    showSearch={showSearch}
                    onToggleSearch={toggleSearch}
                />
                <DataTable
                    columns={tableColumns}
                    data={tableData}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={onColumnVisibilityChange}
                    searchValue={searchValue}
                    searchTxt={header.searchBtn}
                    notFoundContent={header.notFoundContent}
                    globalSearch={showSearch}
                    onGlobalSearch={handleGlobalSearch}
                    handleSearch={handleSearch}
                    columnVisibilityLabel={t('Columns')}
                />
                <div className="mt-4 flex flex-wrap justify-center md:justify-between gap-4 items-end">
                    <div
                        className="grid grid-cols-2 md:grid-cols-1 gap-4 items-center justify-items-center md:justify-items-normal">
                        <p className="text-sm text-foreground/70">
                            Show {pagination.from} - {pagination.to} of {pagination.total}
                        </p>
                        <div className="max-w-fit">
                            <Select onValueChange={(value) => changeCount(value)} value={count}>
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder={count}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {['5', '10', '50'].map((option) => (
                                        <SelectItem value={option} key={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        {tableData.length > 0 && (
                            <PaginationRender
                                pagination={pagination}
                                pageChange={handlePageChange}
                                currentPage={currentPage}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ListTable;
