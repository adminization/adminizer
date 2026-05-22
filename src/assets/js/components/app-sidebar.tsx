import {NavMain} from '@/components/nav-main';
import {FeedbackModal} from '@/components/modals/feedback-modal';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter, SidebarGroup,
    SidebarHeader,
    SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem
} from '@/components/ui/sidebar';
import {type SharedData} from '@/types';
import {Link, usePage} from '@inertiajs/react';
import MaterialIcon from "@/components/material-icon.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ChevronRight, ChevronsUpDown} from "lucide-react";
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@/components/ui/menubar"
import {Collapsible, CollapsibleContent} from "@radix-ui/react-collapsible";
import {CollapsibleTrigger} from "@/components/ui/collapsible.tsx";

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

type Section = {
    id: string
    title: string
    link: string
    icon: string
    type: 'blank' | 'self'
    subItems?: Section[]
}

interface MenuProps extends SharedData {
    section: Section[]
    showVersion?: boolean
    versionText?: string | null
}

export function AppSidebar() {
    const page = usePage<MenuProps>();
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem key={page.props.brand}>
                        <Menubar className="p-0 shadow-none border-none bg-transparent hidden md:block">
                            <MenubarMenu>
                                <MenubarTrigger asChild
                                                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md">
                                    <SidebarMenuButton asChild>
                                        <Button variant="ghost" asChild className={`w-full ${!page.props.section ? 'pointer-events-none' : ''}`}>
                                            <div>
                                                <MaterialIcon name="rocket_launch" className="!text-[18px]"/>
                                                <span
                                                    className="group-data-[state=collapsed]:hidden">{page.props.brand}</span>
                                                {page.props.section && <ChevronsUpDown
                                                    className="ml-auto group-data-[state=collapsed]:hidden"/>}
                                            </div>
                                        </Button>
                                    </SidebarMenuButton>
                                </MenubarTrigger>
                                {page.props.section && <MenubarContent side="right" className="z-[1003]">
                                    {page.props.section.map((itemSection) => (
                                        <div key={itemSection.id}>
                                            {itemSection.subItems ?
                                                <MenubarSub>
                                                    <MenubarSubTrigger
                                                        className="flex gap-2 items-center cursor-pointer">
                                                        <MaterialIcon name={itemSection.icon}
                                                                      className="!text-[18px]"/>
                                                        <span className="hover:underline">{itemSection.title}</span>
                                                    </MenubarSubTrigger>
                                                    <MenubarSubContent>
                                                        {itemSection.subItems.map((subItem) => (
                                                            <MenubarItem key={subItem.id}>
                                                                {subItem.type === 'blank' ? (
                                                                    <a href={subItem.link} key={subItem.id}
                                                                       target="_blank"
                                                                       className="flex gap-2 items-center">
                                                                        {subItem.icon &&
                                                                            <MaterialIcon name={subItem.icon}
                                                                                          className="!text-[18px]"/>}
                                                                        <span
                                                                            className="hover:underline">{subItem.title}</span>
                                                                    </a>
                                                                ) : (
                                                                    <Link href={subItem.link} key={subItem.id}
                                                                          className="flex gap-2 items-center">
                                                                        {subItem.icon &&
                                                                            <MaterialIcon name={subItem.icon}
                                                                                          className="!text-[18px]"/>}
                                                                        <span
                                                                            className="hover:underline">{subItem.title}</span>
                                                                    </Link>
                                                                )}
                                                            </MenubarItem>
                                                        ))}
                                                    </MenubarSubContent>
                                                </MenubarSub> :
                                                <MenubarItem>
                                                    {itemSection.type === 'blank' ? (
                                                        <a href={itemSection.link} target="_blank"
                                                           className="flex gap-2 items-center">
                                                            {itemSection.icon && <MaterialIcon name={itemSection.icon}
                                                                                               className="!text-[18px]"/>}
                                                            <span className="hover:underline">{itemSection.title}</span>
                                                        </a>
                                                    ) : (
                                                        <Link href={itemSection.link}
                                                              className="flex gap-2 items-center">
                                                            {itemSection.icon && <MaterialIcon name={itemSection.icon}
                                                                                               className="!text-[18px]"/>}
                                                            <span className="hover:underline">{itemSection.title}</span>
                                                        </Link>
                                                    )}
                                                </MenubarItem>}
                                        </div>
                                    ))}
                                </MenubarContent>}
                            </MenubarMenu>
                        </Menubar>
                        {/*mobile menu*/}
                        <SidebarGroup className="px-2 py-0 block md:hidden">
                            <SidebarMenu>
                                <Collapsible
                                    asChild
                                    className="group/collapsible"
                                >
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton>
                                                <MaterialIcon name="rocket_launch" className="!text-[18px]"/>
                                                <span
                                                    className="overflow-hidden text-ellipsis whitespace-nowrap">{page.props.brand}</span>
                                                {page.props.section &&<ChevronRight
                                                    className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"/>}
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        {page.props.section && <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {page.props.section && page.props.section.map((itemSection) => (
                                                    itemSection.subItems ? (
                                                        <SidebarMenu key={itemSection.id}>
                                                            <Collapsible
                                                                asChild
                                                                className="group/collapsible-sub"
                                                            >
                                                                <SidebarMenuItem>
                                                                    <CollapsibleTrigger asChild>
                                                                        <SidebarMenuButton>
                                                                            <MaterialIcon name={itemSection.icon}
                                                                                          className="!text-[18px]"/>
                                                                            <span
                                                                                className="overflow-hidden text-ellipsis whitespace-nowrap">{itemSection.title}</span>
                                                                            <ChevronRight
                                                                                className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible-sub:rotate-90"/>
                                                                        </SidebarMenuButton>
                                                                    </CollapsibleTrigger>
                                                                    <CollapsibleContent>
                                                                        <SidebarMenuSub>
                                                                            {itemSection.subItems.map((subIten) => (
                                                                                <SidebarMenuSubItem
                                                                                    key={subIten.id}>
                                                                                    <SidebarMenuSubButton asChild>
                                                                                        {subIten.type === 'blank' ? (
                                                                                            <a href={subIten.link}
                                                                                               target="_blank"
                                                                                               className="flex gap-2 items-center">
                                                                                                {subIten.icon &&
                                                                                                    <MaterialIcon
                                                                                                        name={subIten.icon}
                                                                                                        className="!text-[18px]"/>}
                                                                                                <span
                                                                                                    className="hover:underline">{subIten.title}</span>
                                                                                            </a>
                                                                                        ) : (
                                                                                            <Link href={subIten.link}
                                                                                                  className="flex gap-2 items-center">
                                                                                                {subIten.icon &&
                                                                                                    <MaterialIcon
                                                                                                        name={subIten.icon}
                                                                                                        className="!text-[18px]"/>}
                                                                                                <span
                                                                                                    className="hover:underline">{subIten.title}</span>
                                                                                            </Link>
                                                                                        )}
                                                                                    </SidebarMenuSubButton>
                                                                                </SidebarMenuSubItem>
                                                                            ))}
                                                                        </SidebarMenuSub>
                                                                    </CollapsibleContent>
                                                                </SidebarMenuItem>
                                                            </Collapsible>
                                                        </SidebarMenu>
                                                    ) : (
                                                        <SidebarMenuSubItem key={itemSection.id}>
                                                            <SidebarMenuSubButton asChild>
                                                                {itemSection.type === 'blank' ? (
                                                                    <a href={itemSection.link} target="_blank"
                                                                       className="flex gap-2 items-center">
                                                                        {itemSection.icon &&
                                                                            <MaterialIcon name={itemSection.icon}
                                                                                          className="!text-[18px]"/>}
                                                                        <span
                                                                            className="hover:underline">{itemSection.title}</span>
                                                                    </a>
                                                                ) : (
                                                                    <Link href={itemSection.link}
                                                                          className="flex gap-2 items-center">
                                                                        {itemSection.icon &&
                                                                            <MaterialIcon name={itemSection.icon}
                                                                                          className="!text-[18px]"/>}
                                                                        <span
                                                                            className="hover:underline">{itemSection.title}</span>
                                                                    </Link>
                                                                )}
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    )
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>}
                                    </SidebarMenuItem>
                                </Collapsible>
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={page.props.menu}/>
            </SidebarContent>

            <SidebarFooter>
                <div className="flex flex-col items-center">
                    {(page.props as any).version && (() => {
                        const v = (page.props as any).version as { text: string | null; link: string | null; hint: string | null };
                        const versionStr = v.text || __APP_VERSION__;
                        const buildDate = new Date(__BUILD_TIME__).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                        // Show build date only when version text is the raw semver (not a custom string like startup time)
                        const label = v.text ? `v.${versionStr}` : `v.${versionStr} · ${buildDate}`;
                        const cls = "text-center opacity-70 hover:opacity-100 transition-opacity text-xs";
                        return v.link ? (
                            <a href={v.link} target="_blank" rel="noreferrer" title={v.hint ?? undefined} className={cls}>
                                {label}
                            </a>
                        ) : (
                            <span title={v.hint ?? undefined} className={cls}>
                                {label}
                            </span>
                        );
                    })()}
                    {(page.props as any).showFeedback && <FeedbackModal />}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
