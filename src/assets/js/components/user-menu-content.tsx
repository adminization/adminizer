import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import MaterialIcon from '@/components/material-icon.tsx';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User, type UserMenuItem } from '@/types';
import { Link } from '@inertiajs/react';
import { LogOut } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
    logout: string
    logoutBtn: string
    /** Extra items above «Log out» (config.userMenu + the context's userMenu). */
    items?: UserMenuItem[]
}

export function UserMenuContent({ user, logout, logoutBtn, items = [] }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.length > 0 && (
                <>
                    <DropdownMenuGroup>
                        {items.map((item) => (
                            <DropdownMenuItem key={item.id} asChild>
                                {item.type === 'blank' ? (
                                    <a className="flex w-full cursor-pointer items-center" href={item.link} target="_blank" rel="noopener noreferrer" onClick={cleanup}>
                                        {item.icon && <MaterialIcon name={item.icon} className="mr-2 !text-[16px]" />}
                                        {item.title}
                                    </a>
                                ) : (
                                    <Link className="flex w-full cursor-pointer items-center" href={item.link} onClick={cleanup}>
                                        {item.icon && <MaterialIcon name={item.icon} className="mr-2 !text-[16px]" />}
                                        {item.title}
                                    </Link>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                </>
            )}
            <DropdownMenuItem asChild>
                <Link className="block w-full cursor-pointer" method="get" href={logout} as="button" onClick={cleanup}>
                    <LogOut className="mr-2" />
                    {logoutBtn}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
