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
import type {ReactNode} from "react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Columns3, Search} from "lucide-react";
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
                    <Icon iconNode={Columns3} className={display === 'icon' ? 'size-5' : 'size-4'}/>
                    {display === 'label' && columnVisibilityLabel}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} side={side} className="w-56">
                <DropdownMenuLabel>{columnVisibilityLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator/>
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
        <>
        <div className="rounded-md border">
            {globalSearch && onGlobalSearch && (
                <div className="flex gap-2 p-2">
                    {!footer && renderColumnVisibilityControl({display: 'icon'})}
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
                        <Icon iconNode={Search} className="size-5"/>
                    </Button>
                </div>
            )}
            {!globalSearch && !footer && (
                <div className="flex justify-start p-2">
                    {renderColumnVisibilityControl()}
                </div>
            )}
            <Table wrapperHeight="h-full">
                <TableHeader className="sticky top-0 z-10 bg-background shadow">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id}>
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
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}
                                               className={cell.column.getIndex() === 0 ? "sticky left-0 bg-background" : ""}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={table.getVisibleLeafColumns().length || columns.length} className="h-24 text-center">
                                {notFoundContent}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        {footer?.(renderColumnVisibilityControl)}
        </>
    )
}
