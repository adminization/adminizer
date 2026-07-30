import {type PointerEvent, type PropsWithChildren, useCallback, useEffect, useState} from 'react';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import {useAiAssistant} from '@/contexts/AiAssistantContext';

const DEFAULT_PANEL_WIDTH = '25vw';
const MARGIN_TRANSITION = 'margin-right 300ms ease-in-out';
const MIN_PANEL_WIDTH_RATIO = 0.25;
const MAX_PANEL_WIDTH_RATIO = 0.55;
const PANEL_WIDTH_STORAGE_KEY = 'adminizer.aiAssistant.panelWidth';

const getPanelWidthBounds = () => ({
    min: Math.round(window.innerWidth * MIN_PANEL_WIDTH_RATIO),
    max: Math.round(window.innerWidth * MAX_PANEL_WIDTH_RATIO),
});

const getDefaultPanelWidth = () => window.innerWidth * MIN_PANEL_WIDTH_RATIO;

const getPersistedPanelWidth = (): number | null => {
    try {
        const width = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
        if (!Number.isFinite(width)) {
            return null;
        }

        const {min, max} = getPanelWidthBounds();
        return Math.min(max, Math.max(min, width));
    } catch {
        return null;
    }
};

export function AiAssistantViewport({children, panelWidth = DEFAULT_PANEL_WIDTH}: PropsWithChildren<{panelWidth?: string}>) {
    const {isEnabled, isOpen} = useAiAssistant();
    const [customPanelWidth, setCustomPanelWidth] = useState<number | null>(getPersistedPanelWidth);
    const [isResizing, setIsResizing] = useState(false);
    const actualPanelWidth = customPanelWidth === null ? panelWidth : `${customPanelWidth}px`;

    const startResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (window.innerWidth < 768) {
            return;
        }

        event.preventDefault();
        const startX = event.clientX;
        const startWidth = customPanelWidth ?? getDefaultPanelWidth();
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        setIsResizing(true);

        const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
            const {min, max} = getPanelWidthBounds();
            const nextWidth = Math.min(max, Math.max(min, startWidth + startX - moveEvent.clientX));
            setCustomPanelWidth(Math.round(nextWidth));
        };
        const stopResize = () => {
            document.body.style.userSelect = previousUserSelect;
            setIsResizing(false);
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', stopResize);
            document.removeEventListener('pointercancel', stopResize);
        };

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', stopResize);
        document.addEventListener('pointercancel', stopResize);
    }, [customPanelWidth]);

    useEffect(() => {
        if (customPanelWidth === null) {
            return;
        }

        try {
            window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(customPanelWidth));
        } catch {
            // Storage can be unavailable in private browsing mode.
        }
    }, [customPanelWidth]);

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
        root.style.setProperty('--ai-assistant-panel-width', actualPanelWidth);

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
    }, [actualPanelWidth]);

    useEffect(() => {
        const root = document.getElementById('app');
        if (!root) {
            return;
        }

        const isMobile = window.innerWidth < 768;
        const actualWidth = isMobile ? '100vw' : actualPanelWidth;
        root.style.setProperty('--ai-assistant-panel-actual-width', actualWidth);

        if (isEnabled && isOpen) {
            // On mobile devices we do not shift the content, since the panel is full screen
            root.style.marginRight = isMobile ? '0' : actualPanelWidth;
            root.dataset.aiAssistantOpen = 'true';
        } else {
            root.style.removeProperty('margin-right');
            root.dataset.aiAssistantOpen = 'false';
        }

        const handleResize = () => {
            const isMobileNow = window.innerWidth < 768;
            const newActualWidth = isMobileNow ? '100vw' : actualPanelWidth;
            root.style.setProperty('--ai-assistant-panel-actual-width', newActualWidth);

            if (customPanelWidth !== null && !isMobileNow) {
                const {min, max} = getPanelWidthBounds();
                setCustomPanelWidth((width) => width === null ? width : Math.min(max, Math.max(min, width)));
            }
            
            if (isEnabled && isOpen) {
                root.style.marginRight = isMobileNow ? '0' : actualPanelWidth;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [actualPanelWidth, customPanelWidth, isEnabled, isOpen]);

    return (
        <>
            {children}
            <AiAssistantPanel
                width={actualPanelWidth}
                isResizing={isResizing}
                onResizeStart={startResize}
            />
        </>
    );
}
