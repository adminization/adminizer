import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import {type BreadcrumbItem} from '@/types';
import {memo, type ReactNode} from 'react';
import {NotificationProvider} from '@/contexts/NotificationContext';
import {AiAssistantProvider} from '@/contexts/AiAssistantContext';
import {AiAssistantWorkspace} from '@/components/ai-assistant/AiAssistantWorkspace';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

const AppLayout = memo(({children, className, breadcrumbs, ...props}: AppLayoutProps) => {
    return (
        <NotificationProvider>
            <AiAssistantProvider>
                <AiAssistantWorkspace>
                    <AppLayoutTemplate breadcrumbs={breadcrumbs} className={className} {...props}>
                        {children}
                    </AppLayoutTemplate>
                </AiAssistantWorkspace>
            </AiAssistantProvider>
        </NotificationProvider>
    )
});

export default AppLayout;
