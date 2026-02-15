import {type PropsWithChildren, useEffect} from 'react';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import {useAiAssistant} from '@/contexts/AiAssistantContext';

const DEFAULT_PANEL_WIDTH = 'min(25vw, 420px)';
const MARGIN_TRANSITION = 'margin-right 300ms ease-in-out';

export function AiAssistantViewport({children, panelWidth = DEFAULT_PANEL_WIDTH}: PropsWithChildren<{panelWidth?: string}>) {
    const {isEnabled, isOpen} = useAiAssistant();

    useEffect(() => {
        const root = document.getElementById('app');
        if (!root) {
            return;
        }

        const previousTransition = root.style.transition;
        const hasMarginTransition = previousTransition?.includes('margin-right');
        if (!hasMarginTransition) {
            root.style.transition = previousTransition
                ? `${previousTransition}, ${MARGIN_TRANSITION}`
                : MARGIN_TRANSITION;
        }

        root.classList.add('ai-assistant-host');
        root.style.setProperty('--ai-assistant-panel-width', panelWidth);

        return () => {
            root.classList.remove('ai-assistant-host');
            root.style.removeProperty('--ai-assistant-panel-width');
            root.style.removeProperty('--ai-assistant-panel-actual-width');
            root.style.removeProperty('margin-right');
            delete root.dataset.aiAssistantOpen;
            if (!hasMarginTransition) {
                root.style.transition = previousTransition;
            }
        };
    }, [panelWidth]);

    useEffect(() => {
        const root = document.getElementById('app');
        if (!root) {
            return;
        }

        const isMobile = window.innerWidth < 768;
        const actualWidth = isMobile ? '100vw' : panelWidth;
        root.style.setProperty('--ai-assistant-panel-actual-width', actualWidth);

        if (isEnabled && isOpen) {
            // On mobile devices we do not shift the content, since the panel is full screen
            root.style.marginRight = isMobile ? '0' : panelWidth;
            root.dataset.aiAssistantOpen = 'true';
        } else {
            root.style.removeProperty('margin-right');
            root.dataset.aiAssistantOpen = 'false';
        }

        const handleResize = () => {
            const isMobileNow = window.innerWidth < 768;
            const newActualWidth = isMobileNow ? '100vw' : panelWidth;
            root.style.setProperty('--ai-assistant-panel-actual-width', newActualWidth);
            
            if (isEnabled && isOpen) {
                root.style.marginRight = isMobileNow ? '0' : panelWidth;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isEnabled, isOpen, panelWidth]);

    return (
        <>
            {children}
            <AiAssistantPanel width={panelWidth}/>
        </>
    );
}
