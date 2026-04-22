import { Link } from '@inertiajs/react';
import { BetweenHorizontalStart, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Icon } from '@/components/icon.tsx';
import MaterialIcon from '@/components/material-icon.tsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuGroup,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu.tsx';
import DeleteModal from '@/components/modals/del-modal.tsx';
import { Action, CrudActions, DelModal } from './types.ts';

interface RowActionsDropdownProps {
    rowId: string | number;
    entityUri: string;
    entityName: string;
    crudActions: CrudActions;
    inlineActions?: Action[];
    delModal: DelModal;
}

export function RowActionsDropdown({
    rowId,
    entityUri,
    entityName,
    crudActions,
    inlineActions,
    delModal
}: RowActionsDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild className="cursor-pointer">
                <Button variant="outline" size="icon">
                    <BetweenHorizontalStart />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-46" side="right" align="start">
                <DropdownMenuGroup>
                    {crudActions?.editTitle && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link
                                href={`${entityUri}/edit/${rowId}`}
                                onClick={() => {
                                    localStorage.setItem('backUrl', window.location.pathname + window.location.search);
                                }}
                            >
                                <Icon iconNode={Pencil} />
                                {crudActions.editTitle}
                            </Link>
                        </DropdownMenuItem>
                    )}
                    {crudActions?.viewsTitle && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`${entityUri}/view/${rowId}`}>
                                <Icon iconNode={Eye} />
                                {crudActions.viewsTitle}
                            </Link>
                        </DropdownMenuItem>
                    )}
                    {crudActions?.deleteTitle && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <DeleteModal
                                btnTitle={crudActions.deleteTitle}
                                delModal={delModal}
                                btnCLass="font-normal text-destructive hover:text-destructive w-full cursor-pointer justify-start"
                                link={`${entityUri}/remove/${rowId}?referTo=${encodeURIComponent(window.location.search)}`}
                            />
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>
                {inlineActions && inlineActions.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        {inlineActions.map((action: Action) => (
                            <DropdownMenuItem
                                key={action.id}
                                asChild
                                className="cursor-pointer"
                            >
                                {action.type === 'blank' ? (
                                    <a target="_blank" href={`${action.link}?id=${rowId}&entity=${entityName}`}>
                                        {action.icon && (
                                            <MaterialIcon name={action.icon} className="!text-[18px] mr-2" />
                                        )}
                                        <span>{action.title}</span>
                                    </a>
                                ) : (
                                    <Link
                                        href={`${action.link}/${rowId}?id=${rowId}&entity=${entityName}`}
                                    >
                                        {action.icon && (
                                            <MaterialIcon name={action.icon} className="!text-[18px] mr-2" />
                                        )}
                                        <span>{action.title}</span>
                                    </Link>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
