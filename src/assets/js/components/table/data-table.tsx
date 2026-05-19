import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    OnChangeFn,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/icon.tsx";
import { Columns3, Search } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[],
    notFoundContent: string,
    globalSearch?: boolean,
    searchValue?: string
    onGlobalSearch?: (value: string) => void
    handleSearch?: () => void
    searchTxt?: string
    columnVisibility?: VisibilityState
    onColumnVisibilityChange?: OnChangeFn<VisibilityState>
    columnVisibilityLabel: string
    footer?: (renderColumnVisibilityControl: (options?: ColumnVisibilityControlOptions) => ReactNode) => ReactNode
}

interface ColumnVisibilityControlOptions {
    display?: 'icon' | 'label'
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'right' | 'bottom' | 'left'
}

interface FloatingHeaderState {
    visible: boolean
    top: number
    left: number
    width: number
    tableWidth: number
    headerHeight: number
    scrollLeft: number
    columnWidths: number[]
}

const initialFloatingHeader: FloatingHeaderState = {
    visible: false,
    top: 0,
    left: 0,
    width: 0,
    tableWidth: 0,
    headerHeight: 0,
    scrollLeft: 0,
    columnWidths: []
}

function findVerticalScrollContainer(element: HTMLElement | null): HTMLElement | null {
    let parent = element?.parentElement ?? null;

    while (parent) {
        const overflowY = window.getComputedStyle(parent).overflowY;

        if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
            return parent;
        }

        parent = parent.parentElement;
    }

    return null;
}

function areFloatingHeadersEqual(a: FloatingHeaderState, b: FloatingHeaderState) {
    return (
        a.visible === b.visible &&
        a.top === b.top &&
        a.left === b.left &&
        a.width === b.width &&
        a.tableWidth === b.tableWidth &&
        a.headerHeight === b.headerHeight &&
        a.scrollLeft === b.scrollLeft &&
        a.columnWidths.length === b.columnWidths.length &&
        a.columnWidths.every((width, index) => width === b.columnWidths[index])
    )
}

export function DataTable<TData, TValue>(
    {
        columns,
        data,
        notFoundContent,
        globalSearch = false,
        onGlobalSearch,
        searchValue,
        handleSearch,
        searchTxt,
        columnVisibility,
        onColumnVisibilityChange,
        columnVisibilityLabel,
        footer
    }: DataTableProps<TData, TValue>) {
    const tableContainerRef = useRef<HTMLDivElement | null>(null);
    const tableHeaderRef = useRef<HTMLTableSectionElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [floatingHeader, setFloatingHeader] = useState<FloatingHeaderState>(initialFloatingHeader);

    const table = useReactTable({
        data,
        columns,
        state: {
            columnVisibility,
        },
        onColumnVisibilityChange,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableSorting: false,
        manualPagination: true,
    })

    useEffect(() => {
        const tableContainer = tableContainerRef.current;
        const tableHeader = tableHeaderRef.current;

        if (!tableContainer || !tableHeader) {
            return;
        }

        const tableElement = tableContainer.querySelector('table[data-slot="table"]') as HTMLTableElement | null;
        const scrollContainer = findVerticalScrollContainer(tableContainer);

        const updateFloatingHeader = () => {
            if (!tableElement) {
                return;
            }

            const headerRect = tableHeader.getBoundingClientRect();
            const tableRect = tableElement.getBoundingClientRect();
            const containerRect = tableContainer.getBoundingClientRect();
            const scrollBoundaryTop = scrollContainer?.getBoundingClientRect().top ?? 0;
            const scrollBoundaryBottom = scrollContainer?.getBoundingClientRect().bottom ?? window.innerHeight;
            const headerHeight = headerRect.height;
            const isVisible = (
                headerRect.top < scrollBoundaryTop &&
                tableRect.bottom > scrollBoundaryTop + headerHeight &&
                tableRect.top < scrollBoundaryBottom
            );

            const nextHeader = {
                visible: isVisible,
                top: Math.max(scrollBoundaryTop, 0),
                left: containerRect.left,
                width: containerRect.width,
                tableWidth: tableElement.getBoundingClientRect().width,
                headerHeight,
                scrollLeft: tableContainer.scrollLeft,
                columnWidths: Array.from(tableHeader.querySelectorAll('th')).map((cell) => (
                    cell.getBoundingClientRect().width
                ))
            };

            setFloatingHeader((currentHeader) => (
                areFloatingHeadersEqual(currentHeader, nextHeader) ? currentHeader : nextHeader
            ));
        };

        const scheduleUpdate = () => {
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }

            animationFrameRef.current = window.requestAnimationFrame(updateFloatingHeader);
        };

        updateFloatingHeader();

        scrollContainer?.addEventListener('scroll', scheduleUpdate, { passive: true });
        tableContainer.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);

        const resizeObserver = new ResizeObserver(scheduleUpdate);
        resizeObserver.observe(tableContainer);
        resizeObserver.observe(tableHeader);
        resizeObserver.observe(tableElement);

        return () => {
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }

            scrollContainer?.removeEventListener('scroll', scheduleUpdate);
            tableContainer.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            resizeObserver.disconnect();
        };
    }, [columns, data, columnVisibility]);

    const renderColumnVisibilityControl = ({
        display = 'label',
        align = 'start',
        side = 'bottom'
    }: ColumnVisibilityControlOptions = {}) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size={display === 'icon' ? 'icon' : 'sm'}
                    title={columnVisibilityLabel}
                >
                    <Icon iconNode={Columns3} className={display === 'icon' ? 'size-5' : 'size-4'} />
                    {display === 'label' && columnVisibilityLabel}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} side={side} className="w-56">
                <DropdownMenuLabel>{columnVisibilityLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                        >
                            {String(column.columnDef.meta ?? column.id)}
                        </DropdownMenuCheckboxItem>
                    ))
                }
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex flex-none flex-col">
                {globalSearch && onGlobalSearch && (
                    <div className="flex gap-2 p-2">
                        {!footer && renderColumnVisibilityControl({ display: 'icon' })}
                        <Input
                            type="text"
                            value={searchValue}
                            placeholder={searchTxt}
                            className="w-full max-w-[200px] p-2 border rounded"
                            onChange={(e) => {
                                onGlobalSearch(e.target.value)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && handleSearch) {
                                    handleSearch()
                                }
                            }}
                        />
                        <Button variant="outline" size="icon" onClick={handleSearch}>
                            <Icon iconNode={Search} className="size-5" />
                        </Button>
                    </div>
                )}
                {!globalSearch && !footer && (
                    <div className="flex justify-start p-2">
                        {renderColumnVisibilityControl()}
                    </div>
                )}
                <div className="relative min-h-full flex-1 overflow-hidden rounded-md border bg-background">
                    <Table
                        className="border-separate border-spacing-0"
                        wrapperHeight="min-h-full flex-1"
                        ref={tableContainerRef}
                    >
                        <TableHeader ref={tableHeaderRef} className="bg-background shadow">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="transition-none hover:bg-transparent">
                                    {headerGroup.headers.map((header, headerIndex) => {
                                        const edgeRadius = [
                                            headerIndex === 0 ? 'rounded-tl-md' : '',
                                            headerIndex === headerGroup.headers.length - 1 ? 'rounded-tr-md' : ''
                                        ].filter(Boolean).join(' ');

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={`bg-background ${edgeRadius}`}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row, rowIndex) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell, cellIndex) => {
                                            const visibleCells = row.getVisibleCells();
                                            const isLastRow = rowIndex === table.getRowModel().rows.length - 1;
                                            const edgeRadius = [
                                                isLastRow && cellIndex === 0 ? 'rounded-bl-md' : '',
                                                isLastRow && cellIndex === visibleCells.length - 1 ? 'rounded-br-md' : ''
                                            ].filter(Boolean).join(' ');
                                            const edgeBackground = edgeRadius ? 'bg-background' : '';

                                            return (
                                                <TableCell key={cell.id}
                                                    className={`${cell.column.getIndex() === 0 ? "sticky left-0 bg-background" : ""} ${edgeRadius} ${edgeBackground}`}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={table.getVisibleLeafColumns().length || columns.length} className="h-24 rounded-b-md bg-background text-center">
                                        {notFoundContent}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <div
                        className="pointer-events-none absolute inset-x-0 z-20 h-px bg-border shadow-[0_1px_0_0_var(--border)]"
                        style={{ top: tableHeaderRef.current?.getBoundingClientRect().height ?? undefined }}
                    />
                </div>
                {floatingHeader.visible && (
                    <div
                        className="fixed z-50 overflow-hidden bg-background shadow-md transition-none"
                        style={{
                            top: floatingHeader.top,
                            left: floatingHeader.left,
                            width: floatingHeader.width,
                            height: floatingHeader.headerHeight
                        }}
                    >
                        <div
                            className="transition-none"
                            style={{
                                width: floatingHeader.tableWidth,
                                transform: `translateX(${-floatingHeader.scrollLeft}px)`
                            }}
                        >
                            <table className="caption-bottom border-separate border-spacing-0 text-sm transition-none" style={{ width: floatingHeader.tableWidth }}>
                                <colgroup>
                                    {floatingHeader.columnWidths.map((width, index) => (
                                        <col key={index} style={{ width }} />
                                    ))}
                                </colgroup>
                                <TableHeader className="bg-background">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id} className="transition-none hover:bg-transparent">
                                            {headerGroup.headers.map((header) => {
                                                return (
                                                    <TableHead
                                                        key={header.id}
                                                        className="border-b bg-background shadow-[0_2px_0_0_var(--border)] transition-none"
                                                    >
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </TableHead>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            {footer?.(renderColumnVisibilityControl)}
        </div>
    )
}
