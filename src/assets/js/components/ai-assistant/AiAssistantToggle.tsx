import {Sparkles, LoaderCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {useAiAssistant} from '@/contexts/AiAssistantContext';
import clsx from 'clsx';

export function AiAssistantToggle() {
    const {
        isEnabled,
        isOpen,
        toggleChat,
        models,
        sending,
        loading,
    } = useAiAssistant();

    if (!isEnabled) {
        return null;
    }

    const hasModels = models.length > 0;

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        className={clsx('relative', {'text-primary': isOpen})}
                        onClick={toggleChat}
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        aria-controls="ai-assistant-panel"
                        disabled={!hasModels && loading}
                    >
                        {sending ? <LoaderCircle className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-[1002]">
                    <span>AI assistant</span>
                </TooltipContent>
            </Tooltip>
        </>
    );
}
