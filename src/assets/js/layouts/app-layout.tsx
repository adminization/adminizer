import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import {type BreadcrumbItem} from '@/types';
import {memo, type ReactNode} from 'react';
import {NotificationProvider} from '@/contexts/NotificationContext';
import {AiAssistantProvider} from '@/contexts/AiAssistantContext';
import {AiAssistantViewport} from '@/components/ai-assistant/AiAssistantViewport';
import RelationDialogStackProvider from '@/components/relation/RelationDialogStack';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

const AppLayout = memo(({children, className, breadcrumbs, ...props}: AppLayoutProps) => {
    return (
        <NotificationProvider>
            <AiAssistantProvider>
                <RelationDialogStackProvider>
                    <AppLayoutTemplate breadcrumbs={breadcrumbs} className={className} {...props}>
                        {children}
                    </AppLayoutTemplate>
                    <AiAssistantViewport />
                </RelationDialogStackProvider>
            </AiAssistantProvider>
        </NotificationProvider>
    )
});

export default AppLayout;
