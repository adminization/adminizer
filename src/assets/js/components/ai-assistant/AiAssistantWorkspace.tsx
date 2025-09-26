import {PropsWithChildren, CSSProperties} from 'react';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import {AiAssistantPanel} from '@/components/ai-assistant/AiAssistantPanel';
import clsx from 'clsx';

const PANEL_WIDTH = 'min(25vw, 420px)';

export function AiAssistantWorkspace({children}: PropsWithChildren) {
    const {isEnabled, isOpen} = useAiAssistant();
    const wrapperStyle: CSSProperties | undefined = isEnabled && isOpen
        ? {marginRight: PANEL_WIDTH}
        : undefined;

    return (
        <div className="min-h-screen w-full">
            <div
                className={clsx(
                    'transition-[margin] duration-300 ease-in-out',
                    isEnabled ? 'will-change-[margin]' : null,
                )}
                style={wrapperStyle}
            >
                {children}
            </div>
            <AiAssistantPanel width={PANEL_WIDTH}/>
        </div>
    );
}
