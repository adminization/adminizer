import React from 'react';
import {
    Plus,
    Minus,
    Edit,
    ArrowRight,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Or the correct path to your cn utility
import { useI18n } from '@/hooks/use-i18n';

interface Change {
    field: string;
    oldValue: any;
    newValue: any;
    type: string;
}

interface DiffViewerProps {
    changes: Change[];
    title?: string;
    className?: string;
    messages?: Record<string, string>;
}

export const DiffViewer: React.FC<DiffViewerProps> = (
    {
        changes,
        title = 'Changes',
        className = '',
        messages = {},
    }) => {
    const { t: translate } = useI18n({ page: messages });
    const t = (key: string, fallback: string) => translate(key, fallback);

    if (!changes || changes.length === 0) {
        return (
            <div className={cn('bg-muted border border-border rounded-lg p-4', className)}>
                <div className="flex items-center text-muted-foreground">
                    <Eye className="w-5 h-5 mr-2"/>
                    <span>{t('Changes not found', 'Changes not found')}</span>
                </div>
            </div>
        );
    }

    const formatValue = (value: any): string => {
        if (value === null) return 'null';
        if (value === undefined) return '—';
        if (typeof value === 'boolean') return value ? t('Yes', 'Yes') : t('No', 'No');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    const getChangeType = (change: Change): 'added' | 'removed' | 'modified' => {
        if (change.oldValue === undefined) return 'added';
        if (change.newValue === undefined) return 'removed';
        return 'modified';
    };

    return (
        <div className={cn('bg-card border border-border rounded-lg shadow-sm', className)}>
            <div className="px-4 py-3 border-b border-border bg-muted">
                <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                    <Edit className="w-5 h-5 mr-2"/>
                    {title} ({changes.length})
                </h3>
            </div>

            <div className="divide-y divide-border">
                {changes.map((change, index) => {
                    const changeType = getChangeType(change);
                    const icon = changeType === 'added' ? Plus : changeType === 'removed' ? Minus : Edit;

                    const colorClasses = cn(
                        'text-xs px-2 py-1 rounded-full bg-opacity-10',
                        changeType === 'added' && 'text-green-600 bg-green-100',
                        changeType === 'removed' && 'text-destructive bg-destructive/20',
                        changeType === 'modified' && 'text-primary bg-primary/20'
                    );

                    const iconColor = changeType === 'added' ? 'text-green-600' :
                        changeType === 'removed' ? 'text-destructive' : 'text-primary';

                    return (
                        <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    {React.createElement(icon, {className: cn('w-4 h-4 mr-2', iconColor)})}
                                    <span className="font-medium text-card-foreground">{change.field}</span>
                                </div>
                                <span className={colorClasses}>
                                    {changeType === 'added' ? t('Added', 'Added') :
                                        changeType === 'removed' ? t('Removed', 'Removed') : t('Updated', 'Updated')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {changeType !== 'added' && (
                                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                                        <div className="text-xs text-destructive font-medium mb-1">{t('Old', 'Old')}:</div>
                                        <div className="text-destructive-foreground font-mono break-words">
                                            {formatValue(change.oldValue)}
                                        </div>
                                    </div>
                                )}

                                {changeType !== 'removed' && (
                                    <div className="p-2 bg-green-50 border border-green-100 rounded">
                                        <div className="text-xs text-green-600 font-medium mb-1">{t('New', 'New')}:</div>
                                        <div className="text-green-800 font-mono break-words">
                                            {formatValue(change.newValue)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {changeType === 'modified' && (
                                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                                    <ArrowRight className="w-3 h-3 mr-1"/>
                                    {t('changed type', 'changed type')}: {change.type}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
