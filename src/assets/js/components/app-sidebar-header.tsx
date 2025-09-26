import {Breadcrumbs} from '@/components/breadcrumbs';
import {SidebarTrigger} from '@/components/ui/sidebar';
import {type BreadcrumbItem as BreadcrumbItemType, SharedData} from '@/types';
import {NavUser} from "@/components/nav-user.tsx";
import ThemeSwitcher from '@/components/theme-switcher';
import {NotificationCenter} from "@/components/notifications/NotificationCenter.tsx";
import {AiAssistantToggle} from '@/components/ai-assistant/AiAssistantToggle';
import {useNotifications} from "@/contexts/NotificationContext.tsx";
import {LoaderCircle} from "lucide-react";
import {usePage} from "@inertiajs/react";

export function AppSidebarHeader({breadcrumbs = []}: { breadcrumbs?: BreadcrumbItemType[] }) {
    const {tabs} = useNotifications();
    const page = usePage<SharedData>()
    return (
        <header
            className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1"/>
                    <Breadcrumbs breadcrumbs={breadcrumbs}/>
                </div>
                <div className="flex gap-4 items-center">
                    <AiAssistantToggle/>
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
