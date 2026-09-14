import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem, type SharedData} from '@/types';
import {memo, type PropsWithChildren} from 'react';
import {Head, usePage} from "@inertiajs/react";
import {cn} from '@/lib/utils';
import {Toaster} from '@/components/ui/sonner';

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
            <AppSidebar/>
            <SidebarInset className="overflow-hidden">
                <AppSidebarHeader breadcrumbs={crumbs}/>
                <div
                    data-scroll-region="content"
                    className={cn('relative flex min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
                >
                    <div className="flex min-h-full w-full flex-col">
                        {children}
                    </div>
                </div>
                {/* The one Toaster of the admin shell: every page inside the
                    layout, app modules included, shares this queue. */}
                <Toaster position="top-center" richColors closeButton/>
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
