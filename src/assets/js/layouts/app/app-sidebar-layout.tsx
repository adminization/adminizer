import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {type BreadcrumbItem} from '@/types';
import {memo, type PropsWithChildren, type CSSProperties} from 'react';
import {Head, usePage} from "@inertiajs/react";

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    const page = usePage();
    const {isEnabled, isOpen} = useAiAssistant();
    const panelWidth = 'min(25vw, 420px)';
    const contentStyle: CSSProperties | undefined = isEnabled && isOpen ? {marginRight: panelWidth} : undefined;
    return (
        <AppShell variant="sidebar">
            <Head title={page.props.title as string}/>
            <AppSidebar/>
            <SidebarInset className={className}>
                <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                <div className="relative flex-1 overflow-hidden">
                    <div className="h-full transition-[margin] duration-300 ease-in-out" style={contentStyle}>
                        {children}
                    </div>
                    <AiAssistantPanel width={panelWidth}/>
                </div>
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
