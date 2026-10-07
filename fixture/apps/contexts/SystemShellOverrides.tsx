import {Link} from "@inertiajs/react";
import {MaterialIcon, type SlotProps, useAdminContext} from "@/shell";

/**
 * Overrides of the System context. Everything else is inherited from the
 * default context, and `Default` is the inherited part, not necessarily the
 * stock one: the footer below wraps the default context's footer override.
 */
export function HeaderActions({Default, ...props}: SlotProps) {
    const {context} = useAdminContext();
    return (
        <>
            <Link href={`${context?.prefix}/settings`} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
                borderRadius: 6, fontSize: 13, background: "var(--sidebar-accent)", whiteSpace: "nowrap", flexShrink: 0,
            }}>
                <MaterialIcon name="tune" className="!text-[18px]"/>
                System settings
            </Link>
            <Default {...props}/>
        </>
    );
}

export function SidebarFooter({Default}: SlotProps) {
    return (
        <>
            <Default/>
            <div style={{textAlign: "center", fontSize: 11, opacity: 0.6}} className="group-data-[state=collapsed]:hidden">
                System context
            </div>
        </>
    );
}
