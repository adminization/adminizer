import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {memo, type PropsWithChildren} from 'react';
import {Head, usePage} from '@inertiajs/react';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import clsx from 'clsx';

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    const page = usePage();
    const {isOpen, isEnabled} = useAiAssistant();
    return (
        <AppShell variant="sidebar">
            <Head title={page.props.title as string}/>
            <AppSidebar/>
            <SidebarInset className={clsx('relative flex h-full flex-col overflow-hidden', className)}>
                <div className="flex h-full w-full overflow-hidden">
                    <div
                        className={clsx(
                            'flex min-h-0 flex-1 flex-col transition-[width] duration-300 ease-in-out',
                            isEnabled && isOpen ? 'lg:w-3/4' : 'w-full'
                        )}
                        style={{width: isEnabled && isOpen ? '75%' : '100%'}}
                    >
                        <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                        <div className="flex-1 overflow-auto">
                            {children}
                        </div>
                    </div>
                    {isEnabled && <AiAssistantPanel/>}
                </div>
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
