import { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '@/lib/admin-api';
import AppLayout from '@/layouts/app-layout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lock, Globe, Users, X } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import { useI18n } from '@/hooks/use-i18n';

interface FilterItem {
    id: string;
    name: string;
    modelName: string;
    modelTitle: string;
    visibility: string;
    apiEnabled: boolean;
    ownerId: number;
    ownerName?: string;
    isOwner: boolean;
    groupNames?: string[];
}

interface ModelOption {
    name: string;
    title: string;
}

interface ApiResponse {
    filters: FilterItem[];
    models: ModelOption[];
    total: number;
    hasMore: boolean;
}

interface UserFiltersListProps {
    title: string;
    models: ModelOption[];
    apiEndpoint: string;
}

const PAGE_SIZE = 50;
const breadcrumbs: BreadcrumbItem[] = [];

function VisibilityBadge({
    visibility,
    groupNames,
    t
}: {
    visibility: string;
    groupNames?: string[];
    t: (key: string) => string;
}) {
    switch (visibility) {
        case 'private':
            return (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                    <Lock className="h-3 w-3" />
                    {t('Private')}
                </Badge>
            );
        case 'public':
            return (
                <Badge variant="outline" className="gap-1 text-xs font-normal border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                    <Globe className="h-3 w-3" />
                    {t('Public')}
                </Badge>
            );
        case 'groups':
            return (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="gap-1 text-xs font-normal border-blue-500/50 text-blue-600 dark:text-blue-400">
                        <Users className="h-3 w-3" />
                        {t('Groups')}
                    </Badge>
                    {groupNames && groupNames.map((g, i) => (
                        <span key={i} className="text-xs text-muted-foreground">{g}</span>
                    ))}
                </div>
            );
        default:
            return <Badge variant="outline" className="text-xs font-normal">{visibility}</Badge>;
    }
}

function UserFiltersList({ title, models, apiEndpoint }: UserFiltersListProps) {
    const { t } = useI18n();
    const [filters, setFilters] = useState<FilterItem[]>([]);
    const [allModels, setAllModels] = useState<ModelOption[]>(models);
    const [search, setSearch] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('all');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const loaderRef = useRef<HTMLDivElement>(null);

    const loadFilters = useCallback(async (reset = false) => {
        if (loading) return;

        const currentOffset = reset ? 0 : offset;

        if (reset) {
            setFilters([]);
            setOffset(0);
        }

        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                offset: currentOffset,
                limit: PAGE_SIZE,
            };

            if (search) {
                params.search = search;
            }

            if (selectedModel !== 'all') {
                params.modelName = selectedModel;
            }

            const response = await adminApi.get<ApiResponse>(apiEndpoint, { params });
            const data = response.data;

            if (reset) {
                setFilters(data.filters);
            } else {
                setFilters(prev => [...prev, ...data.filters]);
            }

            setHasMore(data.hasMore);
            setOffset(currentOffset + data.filters.length);

            if (data.models && data.models.length > 0) {
                setAllModels(data.models);
            }
        } catch (error) {
            console.error('Failed to load filters:', error);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [apiEndpoint, loading, offset, search, selectedModel]);

    // Initial load
    useEffect(() => {
        loadFilters(true);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadFilters(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Model filter change
    useEffect(() => {
        loadFilters(true);
    }, [selectedModel]);

    // Infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadFilters(false);
                }
            },
            { threshold: 0.1 }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [hasMore, loading, loadFilters]);

    const handleFilterClick = (filter: FilterItem) => {
        window.location.href = `/adminizer/model/${filter.modelName}?filterId=${filter.id}`;
    };

    const handleClearSearch = () => {
        setSearch('');
    };

    const hasActiveFilters = search || selectedModel !== 'all';

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">{t('Loading...')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 h-full">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{title}</h1>
                {hasActiveFilters && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            setSearch('');
                            setSelectedModel('all');
                        }}
                        className="gap-1.5"
                    >
                        <X className="h-4 w-4" />
                        {t('Reset')}
                    </Button>
                )}
            </div>

            {/* Search and filter controls */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Input
                        placeholder={t('Search filters...')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className="absolute right-0 top-0 h-full w-8 px-0 text-destructive cursor-pointer"
                            onClick={handleClearSearch}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="w-52">
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('All models')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('All models')}</SelectItem>
                            {allModels.map(model => (
                                <SelectItem key={model.name} value={model.name}>
                                    {model.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <span className="text-sm text-muted-foreground ml-auto">
                    {filters.length} {t('found')}
                </span>
            </div>

            {/* Filters table */}
            <div className="rounded-md border">
                <Table wrapperHeight="overflow-y-auto h-[calc(100svh-300px)]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">{t('Filter Name')}</TableHead>
                            <TableHead className="w-[20%]">{t('Model')}</TableHead>
                            <TableHead className="w-[15%]">{t('Visibility')}</TableHead>
                            <TableHead className="w-[10%]">{t('API access (feed)')}</TableHead>
                            <TableHead className="w-[15%]">{t('Owner')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <Users className="h-8 w-8 text-muted-foreground/50" />
                                        <p>{t('No filters found')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filters.map(filter => (
                                <TableRow
                                    key={filter.id}
                                    className="cursor-pointer group"
                                    onClick={() => handleFilterClick(filter)}
                                >
                                    <TableCell className="font-medium">
                                        <span className="text-primary group-hover:underline">
                                            {filter.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {filter.modelTitle}
                                    </TableCell>
                                    <TableCell>
                                        <VisibilityBadge visibility={filter.visibility} groupNames={filter.groupNames} t={t} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {filter.apiEnabled ? t('Yes') : t('No')}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            {filter.isOwner ? (
                                                <>
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                    {t('You')}
                                                </>
                                            ) : (
                                                <>
                                                    {filter.ownerName || t('Unknown')}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Loading indicator for infinite scroll */}
            <div ref={loaderRef} className="h-8 flex items-center justify-center">
                {loading && !initialLoading && (
                    <p className="text-sm text-muted-foreground">{t('Loading more...')}</p>
                )}
            </div>
        </div>
    );
}

export default function UserFiltersListPage({ title, models, apiEndpoint }: UserFiltersListProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs} className="overflow-auto h-[calc(100svh-16px)]">
            <UserFiltersList title={title} models={models} apiEndpoint={apiEndpoint} />
        </AppLayout>
    );
}


