import {useI18n} from '@/hooks/use-i18n';
import type {DocSchemaField} from '@/lib/docs-api';
import {cn} from '@/lib/utils';

interface SchemaTableProps {
    fields: DocSchemaField[] | null;
    title?: string | null;
    loading?: boolean;
    className?: string;
}

/**
 * Structure of a model resource: exactly the fields the reader is allowed to
 * see, as `DataAccessor` reported them for the list page.
 */
export function SchemaTable({fields, title, loading = false, className}: SchemaTableProps) {
    const {t} = useI18n();

    return (
        <div className={cn('overflow-hidden rounded-xl border', className)}>
            {title && <div className="bg-muted/50 border-b px-3 py-1.5 text-sm font-medium">{title}</div>}
            {loading || !fields ? (
                <div className="text-muted-foreground p-3 text-sm">{t('Loading...')}</div>
            ) : fields.length === 0 ? (
                <div className="text-muted-foreground p-3 text-sm">{t('No fields to display')}</div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/30 text-muted-foreground">
                            <th className="px-3 py-1.5 text-start font-medium">{t('Field')}</th>
                            <th className="px-3 py-1.5 text-start font-medium">{t('Type')}</th>
                            <th className="px-3 py-1.5 text-start font-medium">{t('Required')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field) => (
                            <tr key={field.name} className="border-t">
                                <td className="px-3 py-1.5">
                                    <span className="font-medium">{field.title || field.name}</span>
                                    {field.title && field.title !== field.name && (
                                        <span className="text-muted-foreground ms-2 font-mono text-xs">{field.name}</span>
                                    )}
                                </td>
                                <td className="px-3 py-1.5 font-mono text-xs">{field.type}</td>
                                <td className="px-3 py-1.5">{field.required ? t('Yes') : t('No')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default SchemaTable;
