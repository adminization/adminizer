import {Link, router} from '@inertiajs/react';
import {BetweenHorizontalStart, Download, Filter, RefreshCcw, Search, Settings, SquarePlus, X} from 'lucide-react';
import {Button} from '@/components/ui/button.tsx';
import {Icon} from '@/components/icon.tsx';
import MaterialIcon from '@/components/material-icon.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu.tsx';
import {HeaderConfig} from './types.ts';
import {FilterPanel} from './filter-panel.tsx';
import {Badge} from '@/components/ui/badge.tsx';
import {cn} from '@/lib/utils';
import {useState} from 'react';
import axios from 'axios';
import {toast} from 'sonner';
import { useFilterTranslations } from './use-filter-translations';

interface TableToolbarProps {
    header: HeaderConfig;
    showSearch: boolean;
    onToggleSearch: () => void;
}

export function TableToolbar({header, showSearch, onToggleSearch}: TableToolbarProps) {
    // Если фильтры включены, показываем кнопку «Фильтры»
    const filtersEnabled = header.filtersEnabled === true;

    // Есть ли активный фильтр
    const hasActiveFilter = !!header.activeFilterName;
    const currentUrlFilterId = new URLSearchParams(window.location.search).get('filterId');
    const canEditActiveFilter = hasActiveFilter && !!currentUrlFilterId;

    // Export loading state
    const [exporting, setExporting] = useState(false);

    // Load translations
    const { t } = useFilterTranslations(header.entity.name);

    /**
     * Handle export request
     */
    const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
        if (exporting) return;
        setExporting(true);

        try {
            // Get current URL params to preserve filter state
            const urlParams = new URLSearchParams(window.location.search);
            const filterId = urlParams.get('filterId') || undefined;

            const response = await axios.post(
                `${header.entity.uri}/export`,
                {
                    format,
                    filterId
                },
                {
                    responseType: 'blob'
                }
            );

            // Create download link
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = `${header.entity.name}_export.${format === 'xlsx' ? 'xlsx' : format}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+?)"?$/);
                if (match) {
                    filename = match[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(`${t('Export to')} ${format.toUpperCase()} ${t('completed')}`);
        } catch (error: any) {
            console.error('Export error:', error);

            // Try to read error message from blob
            if (error.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const json = JSON.parse(text);
                    toast.error(json.error || json.message || t('Export error'));
                } catch {
                    toast.error(t('Export error'));
                }
            } else {
                toast.error(error.response?.data?.error || error.response?.data?.message || t('Export error'));
            }
        } finally {
            setExporting(false);
        }
    };

    // Форматируем условия для отображения
    const formatCondition = (condition: any) => {
        const fallbackCustomField = typeof condition.customHandler === 'string'
            ? condition.customHandler.split('.').pop()
            : '';
        const field = condition.fieldName || condition.field || fallbackCustomField || t('Custom filtering');
        const operator = condition.operator;
        const value = condition.value;

        // Форматируем оператор
        const operatorLabels: Record<string, string> = {
            eq: '=',
            neq: '≠',
            gt: '>',
            gte: '≥',
            lt: '<',
            lte: '≤',
            like: t('Contains'),
            notLike: t('Not contains'),
            in: t('In list'),
            notIn: t('Not in list'),
            isNull: t('Is null'),
            isNotNull: t('Is not null'),
            between: t('Between'),
        };

        const opLabel = operator === 'custom'
            ? (condition.customHandlerName || t('Custom filtering'))
            : (operatorLabels[operator] || operator);

        // Форматируем значение
        let valueStr = '';
        if (Array.isArray(value)) {
            // Для дат форматируем красиво
            const formattedValues = value.map(v => {
                if (typeof v === 'string' && v.includes('T')) {
                    return v.split('T')[0]; // YYYY-MM-DD
                }
                return String(v);
            });
            valueStr = formattedValues.join(` ${t('and')} `);
        } else {
            if (value && typeof value === 'object') {
                valueStr = Object.entries(value)
                    .map(([key, entryValue]) => `${key}: ${String(entryValue ?? '')}`)
                    .join(', ');
            } else {
                valueStr = typeof value === 'string' && value.includes('T') ? value.split('T')[0] : String(value);
            }
        }

        return `${field} ${opLabel} ${valueStr}`;
    };

    const handleFilterClick = () => {
        const filterPanel = (window as any).adminizerFilterPanel;
        if (filterPanel && filterPanel.openFilterDialog) {
            filterPanel.openFilterDialog();
        } else {
            const trigger = document.getElementById('filter-panel-trigger') as HTMLButtonElement | null;
            if (trigger) {
                trigger.click();
            }
        }
    };

    const handleResetFilter = () => {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('filterId');
        router.get(window.location.pathname, Object.fromEntries(urlParams), {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleEditActiveFilter = () => {
        const filterPanel = (window as any).adminizerFilterPanel;

        if (filterPanel && filterPanel.openEditCurrentFilter) {
            filterPanel.openEditCurrentFilter(currentUrlFilterId || undefined);
            return;
        }

        handleFilterClick();
    };

    return (
        <div className="bg-background">
            {/* Скрытый компонент FilterPanel — хранит логику и диалоги */}
            {filtersEnabled && <FilterPanel />}

            {/* Основные кнопки toolbar */}
            <div className="flex flex-wrap gap-2 py-3">
                {header.crudActions?.createTitle && (
                    <Button asChild>
                        <Link href={`${header.entity.uri}/add`}>
                            <Icon iconNode={SquarePlus}/>
                            {header.crudActions.createTitle}
                        </Link>
                    </Button>
                )}
                {filtersEnabled && (
                    <Button
                        variant="outline"
                        onClick={handleFilterClick}
                    >
                        <Icon iconNode={Filter}/>
                        {t('Filters')}
                    </Button>
                )}
                {hasActiveFilter && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={exporting}
                            >
                                <Icon iconNode={exporting ? RefreshCcw : Download}/>
                                {exporting ? t('Exporting...') : t('Export')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuGroup className="grid gap-1">
                                <DropdownMenuItem
                                    onClick={() => handleExport('json')}
                                    className={cn('cursor-pointer')}
                                >
                                    <div className="flex items-center gap-4 w-full">
                                        <span className="font-mono text-xs w-8 shrink-0">JSON</span>
                                        <span className="text-muted-foreground text-xs">{t('Data in JSON format')}</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('csv')}
                                    className={cn('cursor-pointer')}
                                >
                                    <div className="flex items-center gap-4 w-full">
                                        <span className="font-mono text-xs w-8 shrink-0">CSV</span>
                                        <span className="text-muted-foreground text-xs">{t('Text format CSV')}</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('xlsx')}
                                    className={cn('cursor-pointer')}
                                >
                                    <div className="flex items-center gap-4 w-full">
                                        <span className="font-mono text-xs w-8 shrink-0">XLSX</span>
                                        <span className="text-muted-foreground text-xs">{t('Excel file')}</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button
                    className="transition-none cursor-pointer"
                    variant={showSearch ? "destructive" : "outline"}
                    onClick={onToggleSearch}
                >
                    <Icon iconNode={showSearch ? RefreshCcw : Search}/>
                    {showSearch ? header.resetBtn : header.searchBtn}
                </Button>
                {header.actions.length > 0 && (
                    <>
                        <div className="gap-2 ml-0 sm:ml-6 hidden lg:flex">
                            {header.actions.map((action) => (
                                <Button asChild variant="outline" key={action.id}>
                                    {action.type === 'blank' ? (
                                        <a href={action.link} target='_blank'>
                                            {action.icon && (
                                                <MaterialIcon name={action.icon} className="!text-[18px]"/>
                                            )}
                                            {action.title}
                                        </a>
                                    ) : (
                                        <Link href={action.link}>
                                            {action.icon && (
                                                <MaterialIcon name={action.icon} className="!text-[18px]"/>
                                            )}
                                            {action.title}
                                        </Link>
                                    )}
                                </Button>
                            ))}
                        </div>
                        <div className="block lg:hidden ml-0 sm:ml-6">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <BetweenHorizontalStart/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-fit" side="right" align="start">
                                    <DropdownMenuGroup className="grid gap-2">
                                        {header.actions.map((action) => (
                                            <Button asChild variant="outline" key={action.id}>
                                                <a href={action.link} target='_blank'>
                                                    <MaterialIcon name={action.icon} className="!text-[18px]"/>
                                                    {action.title}
                                                </a>
                                            </Button>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                )}
            </div>

            {/* Блок активного фильтра */}
            {hasActiveFilter && (
                <div className="border-t pt-3 pb-2">
                    <div className="flex flex-col gap-2">
                        {/* Верхняя строка: название фильтра + сбросить */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="gap-1 h-7 max-w-full">
                                <Filter className="h-3 w-3"/>
                                <span className="font-medium truncate">{header.activeFilterName}</span>
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground"
                                onClick={handleEditActiveFilter}
                                title={t('Edit filter')}
                                disabled={!canEditActiveFilter}
                            >
                                <Settings className="h-4 w-4"/>
                                <span className="ml-1">{t('Edit')}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={handleResetFilter}
                                title={t('Reset filter')}
                            >
                                <X className="h-4 w-4"/>
                                <span className="ml-1">{t('Reset')}</span>
                            </Button>
                        </div>
                        {/* Условия в виде badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">{t('Conditions')}:</span>
                            {header.activeFilterConditions?.map((condition: any, index: number) => (
                                <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className="gap-1 text-xs max-w-[250px] truncate"
                                    title={formatCondition(condition)}
                                >
                                    <span className="truncate">{formatCondition(condition)}</span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
