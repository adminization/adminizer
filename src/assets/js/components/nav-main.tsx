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
    useSidebar,
} from '@/components/ui/sidebar';
import { type NavItem, SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import React, { useState, useRef, forwardRef } from 'react';
import MaterialIcon from '@/components/material-icon.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { ChevronRight } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';

/** Drawn for sections that carry no icon in `navbar.sections`. */
const DEFAULT_SECTION_ICON = 'folder';
/** Drawn for the active entry of a section when that entry has no icon. */
const DEFAULT_ACTIVE_ICON = 'radio_button_checked';

/** A navigable leaf: either a menu item or one of its actions. */
type NavEntry = {
    id?: string;
    title: string;
    link: string;
    icon?: string | null;
    type?: 'blank' | 'self';
};

/**
 * The anchor of a nav entry. Every caller renders it through an `asChild` slot
 * (sidebar button, dropdown item, tooltip trigger), so it has to forward both
 * the injected props and the ref down to the real element - otherwise the slot
 * silently drops the styling and the trigger wiring.
 */
const EntryLink = forwardRef<HTMLAnchorElement, { entry: NavEntry } & React.ComponentProps<'a'>>(
    ({ entry, ...props }, ref) => {
        const content = (
            <>
                {entry.icon && <MaterialIcon name={entry.icon} className="!text-[18px]" />}
                <span>{entry.title}</span>
            </>
        );

        return entry.type === 'blank' ? (
            <a {...props} ref={ref} href={entry.link} target="_blank" rel="noopener noreferrer">
                {content}
            </a>
        ) : (
            <Link {...props} ref={ref} href={entry.link}>
                {content}
            </Link>
        );
    }
);
EntryLink.displayName = 'EntryLink';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage<SharedData>();
    const { state, isMobile } = useSidebar();
    // Icon-only rail. On mobile the sidebar opens as a full-width sheet, so it
    // is never rendered collapsed there.
    const isRail = state === 'collapsed' && !isMobile;
    const sections = page.props.menuSections ?? {};

    const normalizeUrl = (url: string) => {
        const withoutQuery = url.split('?')[0];
        return withoutQuery.replace(/\/$/, '');
    };

    /**
     * Falls back to the icon of the section's first item that has one: in the
     * collapsed rail the icon is all that tells two sections apart, and configs
     * predating `navbar.sections` would otherwise show identical folders.
     */
    const sectionIcon = (section: string, itemsInSection: NavItem[]) =>
        sections[section]?.icon
        || itemsInSection.find(item => item.icon)?.icon
        || DEFAULT_SECTION_ICON;

    const groupedItems = items.reduce((acc: Record<string, NavItem[]>, item) => {
        const section = item.section || 'Platform';
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {} as Record<string, NavItem[]>);

    // Sections with an explicit `order` come first, ascending. The rest keep the
    // default ordering: 'Platform' first, 'System' last, others alphabetical.
    const sortedSections = Object.keys(groupedItems).sort((a, b) => {
        const orderA = sections[a]?.order;
        const orderB = sections[b]?.order;
        if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        if (a === 'Platform') return -1;
        if (b === 'Platform') return 1;
        if (a === 'System') return 1;
        if (b === 'System') return -1;
        return a.localeCompare(b);
    });

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

    /**
     * The entry of a section that matches the current URL. An action wins over
     * its parent item, so the rail shows what is actually open rather than the
     * group holding it.
     */
    const findActiveEntry = (itemsInSection: NavItem[]): NavEntry | null => {
        for (const item of itemsInSection) {
            const action = item.actions?.find(subItem => isActiveItem(subItem.link));
            if (action) return action as NavEntry;
        }
        return itemsInSection.find(item => isActiveItem(item.link)) ?? null;
    };

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
                                        <EntryLink entry={subItem as NavEntry} />
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
                    <EntryLink entry={item as NavEntry} />
                </SidebarMenuButton>
            </SidebarMenuItem>
        )
    );

    /**
     * A section in the collapsed rail: the section icon opens a dropdown to pick
     * an entry without expanding the sidebar, and the entry currently open is
     * drawn underneath it.
     */
    const RailSection = ({ section, itemsInSection }: { section: string; itemsInSection: NavItem[] }) => {
        const activeEntry = findActiveEntry(itemsInSection);

        return (
            <SidebarGroup className="px-2 py-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                {/* No `tooltip` here: SidebarMenuButton would wrap itself in a
                                    Tooltip and swallow the trigger props. The dropdown labels
                                    itself with the section name instead. */}
                                <SidebarMenuButton isActive={!!activeEntry} aria-label={section}>
                                    <MaterialIcon name={sectionIcon(section, itemsInSection)} className="!text-[18px]" />
                                    <span>{section}</span>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="start" className="min-w-56 z-[1003]">
                                <DropdownMenuLabel className="flex items-center gap-2">
                                    <MaterialIcon name={sectionIcon(section, itemsInSection)} className="!text-[18px]" />
                                    <span>{section}</span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {itemsInSection.map(item => (
                                    item.actions?.length > 0 ? (
                                        <DropdownMenuSub key={item.id || item.title}>
                                            <DropdownMenuSubTrigger>
                                                {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]" />}
                                                <span>{item.title}</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent className="z-[1003]">
                                                {item.actions?.map(subItem => (
                                                    <DropdownMenuItem key={subItem.id || subItem.title} asChild>
                                                        <EntryLink entry={subItem as NavEntry} />
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    ) : (
                                        <DropdownMenuItem key={item.id || item.title} asChild>
                                            <EntryLink entry={item as NavEntry} />
                                        </DropdownMenuItem>
                                    )
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                    {activeEntry && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive tooltip={activeEntry.title}>
                                <EntryLink
                                    entry={{ ...activeEntry, icon: activeEntry.icon || DEFAULT_ACTIVE_ICON }}
                                />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroup>
        );
    };

    return (
        <>
            {sortedSections.map(section => {
                const itemsInSection = groupedItems[section];

                if (isRail) {
                    return <RailSection key={section} section={section} itemsInSection={itemsInSection} />;
                }

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
                            {/* Icon first, chevron pushed to the far right, so section
                                icons sit on the same line as the brand icon above them. */}
                            <div className="flex w-full items-center gap-2">
                                <MaterialIcon name={sectionIcon(section, itemsInSection)} className="!text-[16px]" />
                                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{section}</span>
                                <ChevronRight
                                    className={`ml-auto shrink-0 transform transition-transform duration-200 ${isOpenNow ? 'rotate-90' : ''}`}
                                />
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
