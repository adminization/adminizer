import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {memo, type CSSProperties, type PropsWithChildren, useMemo} from 'react';
import {Head, usePage} from "@inertiajs/react";
import {AiAssistantPanel, AI_ASSISTANT_PANEL_WIDTH} from '@/components/ai-assistant/AiAssistantPanel';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import clsx from 'clsx';

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    const page = usePage();
    const {isOpen} = useAiAssistant();
    const insetStyle = useMemo<CSSProperties | undefined>(() => {
        if (!isOpen) {
            return undefined;
        }
        return {marginRight: AI_ASSISTANT_PANEL_WIDTH};
    }, [isOpen]);

    return (
        <AppShell variant="sidebar">
            <Head title={page.props.title as string}/>
            <AppSidebar/>
            <SidebarInset className="relative flex h-full">
                <div
                    className={clsx(
                        'flex min-h-0 flex-1 flex-col transition-[margin-right] duration-300 ease-in-out',
                        className
                    )}
                    style={insetStyle}
                >
                    <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                    {children}
                </div>
                <AiAssistantPanel/>
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
