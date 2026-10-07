import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {ShellSlot} from '@/components/shell-slot';
import {type BreadcrumbItem, type SharedData} from '@/types';
import {memo, type PropsWithChildren} from 'react';
import {Head, usePage} from "@inertiajs/react";
import {cn} from '@/lib/utils';

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    const page = usePage<SharedData>();
    // Crumbs given by the page component win; otherwise the ones the server
    // sent with the page (`breadcrumbs` prop).
    const crumbs = breadcrumbs.length ? breadcrumbs : (page.props.breadcrumbs ?? []);
    return (
        <AppShell variant="sidebar">
            <Head title={page.props.title as string}/>
            <ShellSlot name="Sidebar" Default={AppSidebar}/>
            <SidebarInset className="overflow-hidden">
                <ShellSlot name="Header" Default={AppSidebarHeader} breadcrumbs={crumbs}/>
                <div
                    data-scroll-region="content"
                    className={cn('relative flex min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
                >
                    <div className="flex min-h-full w-full flex-col">
                        {children}
                    </div>
                </div>
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
