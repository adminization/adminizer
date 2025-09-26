import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {memo, type PropsWithChildren} from 'react';
import {Head, usePage} from "@inertiajs/react";

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    const page = usePage();
    return (
        <AppShell variant="sidebar">
            <Head title={page.props.title as string}/>
            <AppSidebar/>
            <SidebarInset className={className}>
                <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
