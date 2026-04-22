import {ColumnDef} from '@tanstack/react-table';
import {RowActionsDropdown} from './row-actions-dropdown.tsx';
import {HeaderConfig} from './types.ts';

interface ActionsColumnOptions {
    thActionsTitle: string;
    crudActions: HeaderConfig['crudActions'];
    inlineActions: HeaderConfig['inlineActions'];
    entityUri: string;
    entityName: string;
    delModal: HeaderConfig['delModal'];
}

export function createActionsColumn(options: ActionsColumnOptions): ColumnDef<any> {
    return {
        accessorKey: 'actions',
        header: () => (
            <div className="text-center">
                {options.thActionsTitle}
            </div>
        ),
        cell: ({row}) => {
            return (
                <div className="text-center">
                    {(['deleteTitle', 'viewsTitle', 'editTitle'] as const).some(key =>
                            options.crudActions?.[key] && options.crudActions?.[key].trim() !== ''
                        ) &&
                        <RowActionsDropdown
                            rowId={row.original.id}
                            entityUri={options.entityUri}
                            entityName={options.entityName}
                            crudActions={options.crudActions}
                            inlineActions={options.inlineActions}
                            delModal={options.delModal}
                        />
                    }
                </div>
            );
        }
    };
}
