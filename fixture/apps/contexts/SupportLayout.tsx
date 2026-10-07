import {Link, usePage} from "@inertiajs/react";
import {
    Sidebar as UISidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {ContextSwitcher, MaterialIcon, type SlotProps, useAdminContext} from "@/shell";

/**
 * The sidebar of the Support context, written here. The shell around it
 * (sidebar state, mobile sheet) and the whole header stay the stock ones.
 */
export function Sidebar(_: SlotProps) {
    const page = usePage<any>();
    const {menu, isActive} = useAdminContext();

    return (
        <UISidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <ContextSwitcher side="right"/>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Queues</SidebarGroupLabel>
                    <SidebarMenu>
                        {menu.map((item) => (
                            <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton asChild isActive={isActive(item.link)} tooltip={item.title}>
                                    <Link href={item.link}>
                                        {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]"/>}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
                <div style={{margin: "auto 12px 12px", padding: 12, borderRadius: 8, fontSize: 12, background: "var(--sidebar-accent)"}}
                     className="group-data-[state=collapsed]:hidden">
                    On duty: {page.props.auth?.user?.login}
                </div>
            </SidebarContent>
        </UISidebar>
    );
}
