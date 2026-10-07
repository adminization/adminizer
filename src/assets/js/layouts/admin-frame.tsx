import {type ReactNode, useEffect} from 'react';
import {NotificationProvider} from '@/contexts/NotificationContext';
import {AiAssistantProvider} from '@/contexts/AiAssistantContext';
import {AiAssistantViewport} from '@/components/ai-assistant/AiAssistantViewport';
import RelationDialogStackProvider from '@/components/relation/RelationDialogStack';
import {Toaster} from '@/components/ui/sonner';
import {initializeTheme} from '@/hooks/use-appearance';

/**
 * Everything a page needs regardless of the layout drawn around it: the
 * providers, the assistant viewport and the one Toaster of the admin shell
 * (every page, app modules and custom layouts included, shares this queue).
 */
export function AdminFrame({children}: { children: ReactNode }) {
    // The stock header's theme switcher is not part of every layout, so the
    // saved theme is applied here.
    useEffect(() => {
        initializeTheme();
    }, []);

    return (
        <NotificationProvider>
            <AiAssistantProvider>
                <RelationDialogStackProvider>
                    {children}
                    <AiAssistantViewport/>
                    <Toaster position="top-center" richColors closeButton/>
                </RelationDialogStackProvider>
            </AiAssistantProvider>
        </NotificationProvider>
    );
}
