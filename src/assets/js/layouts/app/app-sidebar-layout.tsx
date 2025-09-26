import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {memo, type PropsWithChildren, type CSSProperties, useMemo} from 'react';
import {Head, usePage} from "@inertiajs/react";
import clsx from 'clsx';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {AI_ASSISTANT_PANEL_WIDTH} from '@/components/ai-assistant/constants';

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    const page = usePage();
    const {isEnabled: isAssistantEnabled, isOpen: isAssistantOpen} = useAiAssistant();

    const insetClassName = useMemo(
        () => clsx(
            'transition-[padding-right] duration-300 ease-in-out',
            className,
        ),
        [className],
    );

    const insetStyle = useMemo<CSSProperties | undefined>(() => {
        if (!isAssistantEnabled || !isAssistantOpen) {
            return undefined;
        }
        return {paddingRight: AI_ASSISTANT_PANEL_WIDTH};
    }, [isAssistantEnabled, isAssistantOpen]);

    return (
        <AppShell variant="sidebar">
            <Head title={page.props.title as string}/>
            <AppSidebar/>
            <SidebarInset className={insetClassName} style={insetStyle}>
                <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                {children}
            </SidebarInset>
            <AiAssistantPanel/>
        </AppShell>
    );
})

export default AppSidebarLayout
