import {useState} from "react";
import {Link} from "@inertiajs/react";
import {MaterialIcon, type SlotProps, useAdminContext} from "@/shell";

/**
 * Overrides of the Reports context (registered by the host). Each one keeps
 * the inherited part through `Default` and adds to it; the classes come from
 * ReportsShellOverrides.css, the context's `layout.stylesheet`.
 */

/** The whole sidebar: an icon rail of the context's pages next to it. */
export function Sidebar({Default, ...props}: SlotProps) {
    const {menu, isActive} = useAdminContext();
    const items = menu.flatMap((item): { id: string; title: string; link: string; icon?: string | null }[] =>
        item.actions?.length ? item.actions : [item]);
    return (
        <>
            <Default {...props}/>
            <nav className="reports-rail" aria-label="Reports">
                {items.map((item) => (
                    <Link key={item.id} href={item.link} title={item.title}
                          className={isActive(item.link) ? "reports-rail-active" : undefined}>
                        <MaterialIcon name={item.icon ?? "description"} className="!text-[20px]"/>
                    </Link>
                ))}
            </nav>
        </>
    );
}

/** Sidebar header: a caption under the inherited context switcher. */
export function SidebarHeader({Default}: SlotProps) {
    return (
        <>
            <Default/>
            <div className="reports-caption group-data-[state=collapsed]:hidden">Analytics workspace</div>
        </>
    );
}

/** Sidebar content: a period filter above the inherited menu. */
export function SidebarContent({Default}: SlotProps) {
    const [period, setPeriod] = useState("Week");
    return (
        <>
            <div className="reports-periods group-data-[state=collapsed]:hidden">
                {["Day", "Week", "Month"].map((value) => (
                    <button key={value} type="button" onClick={() => setPeriod(value)}
                            className={value === period ? "reports-period-active" : undefined}>
                        {value}
                    </button>
                ))}
            </div>
            <Default/>
        </>
    );
}

/** The whole header: a banner above the inherited one. */
export function Header({Default, ...props}: SlotProps) {
    return (
        <>
            <div className="reports-banner">Demo data · refreshed nightly</div>
            <Default {...props}/>
        </>
    );
}

/** Header start: a tag after the inherited toggle and breadcrumbs. */
export function HeaderStart({Default, ...props}: SlotProps) {
    return (
        <>
            <Default {...props}/>
            <span className="reports-tag">Read-only</span>
        </>
    );
}
