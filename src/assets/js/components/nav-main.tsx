import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { type NavItem, SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useState, useRef } from 'react';
import MaterialIcon from '@/components/material-icon.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { ChevronRight } from 'lucide-react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    const normalizeUrl = (url: string) => {
        const withoutQuery = url.split('?')[0];
        return withoutQuery.replace(/\/$/, '');
    };

    const groupedItems = items.reduce((acc: Record<string, NavItem[]>, item) => {
        const section = item.section || 'Platform';
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {});

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        items.forEach(item => {
            const section = item.section || 'Platform';
            init[section] = false;
        });
        return init;
    });

    const [touchedGroups, setTouchedGroups] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        items.forEach(item => {
            const section = item.section || 'Platform';
            init[section] = false;
        });
        return init;
    });

    const isActiveItem = (itemLink: string) => {
        const currentUrl = normalizeUrl(page.url);
        const normalizedItemLink = normalizeUrl(itemLink);
        return currentUrl === normalizedItemLink || currentUrl.startsWith(`${normalizedItemLink}/`);
    };

    // Add ref to store the current state
    const openGroupsRef = useRef(openGroups);
    const touchedGroupsRef = useRef(touchedGroups);

    // Synchronize ref when updating state
    openGroupsRef.current = openGroups;
    touchedGroupsRef.current = touchedGroups;

    const MenuEntry = ({ item }: { item: NavItem }) => (
        item.actions?.length > 0 ? (
            <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActiveItem(item.link)}
                className="group/collapsible"
            >
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                            <MaterialIcon name={item.icon} className="!text-[18px]" />
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.title}</span>
                            <ChevronRight
                                className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                            />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.actions?.map(subItem => (
                                <SidebarMenuSubItem key={subItem.id}>
                                    <SidebarMenuSubButton asChild isActive={isActiveItem(subItem.link)}>
                                        {subItem.type === 'blank' ? (
                                            <a href={subItem.link} target="_blank" rel="noopener noreferrer">
                                                {subItem.icon && (
                                                    <MaterialIcon name={subItem.icon} className="!text-[18px]" />
                                                )}
                                                <span>{subItem.title}</span>
                                            </a>
                                        ) : (
                                            <Link href={subItem.link}>
                                                {subItem.icon && (
                                                    <MaterialIcon name={subItem.icon} className="!text-[18px]" />
                                                )}
                                                <span>{subItem.title}</span>
                                            </Link>
                                        )}
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        ) : (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                    asChild
                    isActive={isActiveItem(item.link)}
                    tooltip={{ children: item.title }}
                >
                    {item.type === 'blank' ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                            {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]" />}
                            <span>{item.title}</span>
                        </a>
                    ) : (
                        <Link href={item.link}>
                            {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]" />}
                            <span>{item.title}</span>
                        </Link>
                    )}
                </SidebarMenuButton>
            </SidebarMenuItem>
        )
    );

    return (
        <>
            {Object.entries(groupedItems).map(([section, itemsInSection]) => {
                const isAnyItemActive = itemsInSection.some(item => {
                    if (item.actions?.length > 0) {
                        return item.actions.some(subItem => isActiveItem(subItem.link));
                    }
                    return isActiveItem(item.link);
                });

                // We put the isOpen logic into a variable, but use the actual data from the ref
                const isOpenNow = touchedGroups[section]
                    ? openGroups[section]
                    : isAnyItemActive;

                return (
                    <SidebarGroup key={section} className="px-2 py-0">
                        <SidebarGroupLabel
                            asChild
                            className="cursor-pointer"
                            onClick={() => {
                                // We determine a new state based on current values
                                const wasTouched = touchedGroupsRef.current[section];
                                const isOpen = wasTouched
                                    ? openGroupsRef.current[section]
                                    : isAnyItemActive;

                                // Switching the state
                                const nextOpen = !isOpen;

                                // Updating states
                                setTouchedGroups(prev => ({
                                    ...prev,
                                    [section]: true,
                                }));
                                setOpenGroups(prev => ({
                                    ...prev,
                                    [section]: nextOpen,
                                }));
                            }}
                        >
                            <div className="flex items-center gap-1">
                                <ChevronRight
                                    className={`transform transition-transform duration-200 ${isOpenNow ? 'rotate-90' : ''}`}
                                />
                                <span>{section}</span>
                            </div>
                        </SidebarGroupLabel>
                        {isOpenNow && (
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {itemsInSection.map(item => (
                                        <MenuEntry item={item} key={item.id || item.title} />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        )}
                    </SidebarGroup>
                );
            })}
        </>
    );
}