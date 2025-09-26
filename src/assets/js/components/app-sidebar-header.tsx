import {Breadcrumbs} from '@/components/breadcrumbs';
import {SidebarTrigger} from '@/components/ui/sidebar';
import {type BreadcrumbItem as BreadcrumbItemType, SharedData} from '@/types';
import {NavUser} from "@/components/nav-user.tsx";
import ThemeSwitcher from '@/components/theme-switcher';
import {NotificationCenter} from "@/components/notifications/NotificationCenter.tsx";
import {useNotifications} from "@/contexts/NotificationContext.tsx";
import {LoaderCircle, Sparkles} from "lucide-react";
import {usePage} from "@inertiajs/react";
import {Button} from "@/components/ui/button.tsx";
import {useAiAssistant} from "@/contexts/AiAssistantContext";
import {AiAssistantPanel} from "@/components/ai/AiAssistantPanel.tsx";

export function AppSidebarHeader({breadcrumbs = []}: { breadcrumbs?: BreadcrumbItemType[] }) {
    const {tabs} = useNotifications();
    const page = usePage<SharedData>()
    const {enabled: aiEnabled, openAssistant} = useAiAssistant();
    return (
        <header
            className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1"/>
                    <Breadcrumbs breadcrumbs={breadcrumbs}/>
                </div>
                <div className="flex gap-4 items-center">
                    {aiEnabled && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open AI assistant"
                                onClick={openAssistant}
                            >
                                <Sparkles className="h-4 w-4" />
                            </Button>
                            <AiAssistantPanel />
                        </>
                    )}
                    <ThemeSwitcher/>
                    {page.props.notifications && (
                        tabs.length > 0 ?
                            <NotificationCenter/> :
                            <div className="w-[40px] flex-none flex justify-center">
                                <LoaderCircle className="size-4 animate-spin"/>
                            </div>
                    )}
                    <NavUser/>
                </div>
            </div>
        </header>
    );
}
