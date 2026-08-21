import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, SharedData } from '@/types';
import { NavUser } from "@/components/nav-user.tsx";
import ThemeSwitcher from '@/components/theme-switcher';
import { NotificationCenter } from "@/components/notifications/NotificationCenter.tsx";
import { AiAssistantToggle } from '@/components/ai-assistant/AiAssistantToggle';
import { DocsInfoButton } from '@/components/docs/DocsDrawer';
import { useNotifications } from "@/contexts/NotificationContext.tsx";
import { LoaderCircle, History } from "lucide-react";
import { Link, usePage } from "@inertiajs/react";
import { Button } from '@/components/ui/button';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { tabs } = useNotifications();
    const page = usePage<SharedData>()
    return (
        <header
            className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                <div className="flex gap-4 items-center">
                    <AiAssistantToggle />
                    <DocsInfoButton />
                    {page.props.history && <Link href={`${window.routePrefix}/history/view-all`}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                        >
                            <History />
                        </Button>
                    </Link>
                    }
                    <ThemeSwitcher />
                    {page.props.notifications && (
                        tabs === null ? (
                            <div className="w-[40px] flex-none flex justify-center">
                                <LoaderCircle className="size-4 animate-spin" />
                            </div>
                        ) : (
                            tabs.length ? (
                                <NotificationCenter />
                            ) : null
                        )
                    )}
                    <NavUser />
                </div>
            </div>
        </header>
    );
}
