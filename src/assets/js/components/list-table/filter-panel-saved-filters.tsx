import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Play, Settings, Lock, Globe, Users, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import DeleteModal from '@/components/modals/del-modal';
import MaterialIcon from '@/components/material-icon.tsx';
import { useFilterTranslations } from './use-filter-translations';

interface SavedFilter {
    id: string;
    name: string;
    description?: string;
    modelName: string;
    conditions: any[];
    sortField?: string;
    sortDirection?: 'ASC' | 'DESC';
    visibility: 'private' | 'public' | 'groups' | 'system';
    owner: number | any;
    ownerId?: number;
    ownerInfo?: {
        id: number;
        login: string;
        fullName?: string;
    };
    icon?: string;
    color?: string;
    resultCount?: number;
    createdAt: string;
    updatedAt: string;
}

interface SavedFiltersListProps {
    modelName: string;
    onApplyFilter?: (filter: SavedFilter) => void;
    onEditFilter?: (filter: SavedFilter) => void;
    onDeleteFilter?: (filterId: string) => void;
    activeFilterId?: string;
    user?: {
        id: number;
        isAdministrator?: boolean;
        groups?: Array<{ id: number; name: string }>;
    };
}

export function SavedFiltersList({
    modelName,
    onApplyFilter,
    onEditFilter,
    onDeleteFilter,
    activeFilterId,
    user
}: SavedFiltersListProps) {
    const [filters, setFilters] = useState<SavedFilter[]>([]);
    const [loading, setLoading] = useState(false);
    const { t } = useFilterTranslations(modelName);

    useEffect(() => {
        loadFilters();
        
        // Подписка на событие обновления фильтров
        const handleFilterChanged = () => {
            loadFilters();
        };
        
        window.addEventListener('adminizer:filterChanged', handleFilterChanged);
        return () => {
            window.removeEventListener('adminizer:filterChanged', handleFilterChanged);
        };
    }, [modelName]);

    const loadFilters = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/adminizer/model/${modelName}/saved-filters`);
            setFilters(response.data.filters || []);
        } catch (error: any) {
            console.error('Error loading saved filters:', error);
            
            // Если 401 - редирект на логин
            if (error.response?.status === 401) {
                console.error('Session expired, redirecting to login...');
                window.location.href = '/adminizer/model/userap/login';
                return;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApply = (filter: SavedFilter) => {
        onApplyFilter?.(filter);
    };

    const handleDelete = async (filter: SavedFilter) => {
        try {
            await axios.delete(`/adminizer/model/${modelName}/filter/${filter.id}`);
            onDeleteFilter?.(filter.id);
            loadFilters(); // Перезагружаем список
        } catch (error: any) {
            console.error('Error deleting filter:', error);

            // Если 401 - редирект на логин
            if (error.response?.status === 401) {
                console.error('Session expired, redirecting to login...');
                window.location.href = '/adminizer/model/userap/login';
                return;
            }

            // Если 403 - нет прав
            if (error.response?.status === 403) {
                alert(t('No permission to delete filter'));
                return;
            }
        }
    };

    const handleEdit = async (filter: SavedFilter) => {
        try {
            // Fetch fresh filter payload to avoid editing stale conditions from local list cache.
            const response = await axios.get(`/adminizer/model/${modelName}/saved-filters`);
            const savedFilters = response.data?.filters || [];
            const freshFilter = savedFilters.find((f: SavedFilter) => String(f.id) === String(filter.id));
            onEditFilter?.(freshFilter || filter);
        } catch (error) {
            console.error('Error loading fresh filter for edit:', error);
            onEditFilter?.(filter);
        }
    };

    // Проверка прав на редактирование/удаление
    const canEditOrDelete = (filter: SavedFilter): boolean => {
        // Админ может всё
        if (user?.isAdministrator) {
            return true;
        }
        // Владелец может редактировать своё
        if (filter.ownerId && user?.id && filter.ownerId === user.id) {
            return true;
        }
        // Также проверяем owner (старое поле)
        if (filter.owner && user?.id && filter.owner.id === user.id) {
            return true;
        }
        // Также проверяем ownerInfo
        if (filter.ownerInfo && user?.id && filter.ownerInfo.id === user.id) {
            return true;
        }
        // Обычные пользователи могут редактировать ТОЛЬКО свои фильтры
        // Групповые и публичные фильтры — только админ может редактировать
        return false;
    };

    const isMaterialIconName = (iconName?: string): iconName is string => {
        return Boolean(iconName) && /^[a-z0-9_]+$/i.test(iconName);
    };

    if (loading) {
        return (
            <div className="py-4 text-center text-sm text-muted-foreground">
                {t('Loading filters...')}
            </div>
        );
    }

    if (filters.length === 0) {
        return (
            <div className="py-4 text-center text-sm text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('No saved filters')}</p>
                <p className="text-xs mt-1">{t('Save current filter for quick access')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 py-2">
            {filters.map((filter) => {
                const canEdit = canEditOrDelete(filter);
                const isOwner = filter.ownerId === user?.id || 
                               filter.owner?.id === user?.id || 
                               filter.ownerInfo?.id === user?.id;

                return (
                    <div
                        key={filter.id}
                        className={cn(
                            "flex items-center gap-2 p-2 rounded-md border transition-colors",
                            "hover:bg-accent/50",
                            activeFilterId === filter.id && "bg-accent/70 border-accent"
                        )}
                    >
                        {/* Иконка и название */}
                        <div
                            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleApply(filter)}
                        >
                            {filter.icon && (
                                <span className="h-6 w-6 flex items-center justify-center text-muted-foreground">
                                    {isMaterialIconName(filter.icon)
                                        ? <MaterialIcon name={filter.icon} className="!text-[18px]" />
                                        : <span className="text-lg leading-none">{filter.icon}</span>}
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-sm truncate">{filter.name}</span>
                                    {/* Иконка видимости */}
                                    {filter.visibility === 'private' && (
                                        <span title={isOwner ? t('Private filter') : `${t("Someone else's private filter (owner:")} ${filter.ownerInfo?.fullName || filter.ownerInfo?.login || t('unknown)')}`}>
                                            <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        </span>
                                    )}
                                    {filter.visibility === 'groups' && (
                                        <span title={t('For groups')}>
                                            <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        </span>
                                    )}
                                    {filter.visibility === 'public' && (
                                        <span title={t('Public filter')}>
                                            <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        </span>
                                    )}
                                </div>
                                {filter.description && (
                                    <div className="text-xs text-muted-foreground truncate">
                                        {filter.description}
                                    </div>
                                )}
                                {/* Показываем владельца для чужих приватных фильтров */}
                                {!isOwner && filter.visibility === 'private' && filter.ownerInfo && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {t('Owner')}: {filter.ownerInfo.fullName || filter.ownerInfo.login}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Количество результатов */}
                        {filter.resultCount !== undefined && filter.resultCount >= 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {filter.resultCount}
                            </Badge>
                        )}

                        {/* Кнопки действий */}
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleApply(filter);
                                }}
                                title={t('Apply filter')}
                            >
                                <Play className="h-3.5 w-3.5" />
                            </Button>
                            {canEdit && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(filter);
                                        }}
                                        title={t('Edit')}
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                    </Button>
                                    <DeleteModal
                                        btnTitle=""
                                        delModal={{
                                            yes: t('Yes'),
                                            no: t('No'),
                                            text: `${t('Delete filter')} "${filter.name}"?`
                                        }}
                                        handleDelete={() => {
                                            handleDelete(filter);
                                        }}
                                        isLink={false}
                                        variant="ghost"
                                        btnCLass="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
