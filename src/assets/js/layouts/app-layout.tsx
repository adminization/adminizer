import {type BreadcrumbItem} from '@/types';
import {memo, type ReactNode} from 'react';
import {AdminFrame} from '@/layouts/admin-frame';
import {ContextLayoutHost} from '@/layouts/context-layout-host';
import {registerShellComponents} from '@/shell-globals';

// Custom context layouts are loaded by ContextLayoutHost, so the stock shell
// parts they may reuse are published together with it.
registerShellComponents();

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

const AppLayout = memo(({children, className, breadcrumbs}: AppLayoutProps) => {
    return (
        <AdminFrame>
            <ContextLayoutHost breadcrumbs={breadcrumbs} className={className}>
                {children}
            </ContextLayoutHost>
        </AdminFrame>
    )
});

export default AppLayout;
