import {useCallback, useEffect, useMemo, useState} from 'react';
import {ColumnDef, Updater, VisibilityState} from '@tanstack/react-table';

const STORAGE_VERSION = 'v1';

function resolveColumnId(column: ColumnDef<any>): string | null {
    if (typeof column.id === 'string' && column.id.length > 0) {
        return column.id;
    }

    if (typeof column.accessorKey === 'string' && column.accessorKey.length > 0) {
        return column.accessorKey;
    }

    return null;
}

function normalizeVisibilityState(
    rawState: unknown,
    allColumnIds: Set<string>,
    lockedColumnIds: Set<string>
): VisibilityState {
    if (!rawState || typeof rawState !== 'object') {
        return {};
    }

    const parsed = rawState as Record<string, unknown>;
    const normalized: VisibilityState = {};

    Object.entries(parsed).forEach(([columnId, value]) => {
        if (!allColumnIds.has(columnId) || lockedColumnIds.has(columnId)) {
            return;
        }

        if (typeof value === 'boolean') {
            normalized[columnId] = value;
        }
    });

    return normalized;
}

export function usePersistedColumnVisibility(modelName: string, columns: ColumnDef<any>[]) {
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const storageKey = useMemo(
        () => `adminizer:list:${modelName}:columns:${STORAGE_VERSION}`,
        [modelName]
    );

    const allColumnIds = useMemo(() => {
        const ids = new Set<string>();
        columns.forEach((column) => {
            const columnId = resolveColumnId(column);
            if (columnId) {
                ids.add(columnId);
            }
        });
        return ids;
    }, [columns]);

    const lockedColumnIds = useMemo(() => {
        const ids = new Set<string>();
        columns.forEach((column) => {
            if (column.enableHiding === false) {
                const columnId = resolveColumnId(column);
                if (columnId) {
                    ids.add(columnId);
                }
            }
        });
        return ids;
    }, [columns]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) {
                setColumnVisibility({});
                return;
            }

            const parsed = JSON.parse(raw);
            const normalized = normalizeVisibilityState(parsed, allColumnIds, lockedColumnIds);
            setColumnVisibility(normalized);
        } catch {
            setColumnVisibility({});
        }
    }, [storageKey, allColumnIds, lockedColumnIds]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const normalized = normalizeVisibilityState(columnVisibility, allColumnIds, lockedColumnIds);
        window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    }, [columnVisibility, storageKey, allColumnIds, lockedColumnIds]);

    const handleColumnVisibilityChange = useCallback((updater: Updater<VisibilityState>) => {
        setColumnVisibility((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return normalizeVisibilityState(next, allColumnIds, lockedColumnIds);
        });
    }, [allColumnIds, lockedColumnIds]);

    return {
        columnVisibility,
        onColumnVisibilityChange: handleColumnVisibilityChange
    };
}
