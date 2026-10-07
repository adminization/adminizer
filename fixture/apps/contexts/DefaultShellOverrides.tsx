import {type SlotProps} from "@/shell";

const badge = {
    margin: "0 auto 6px", padding: "2px 8px", borderRadius: 999, fontSize: 11,
    background: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)",
};

/**
 * Overrides of the default context, set by the host through
 * `contextHandler.configureDefault()`. Contexts inheriting the default layout
 * get them too.
 */
export function SidebarFooter({Default}: SlotProps) {
    return (
        <>
            <div style={badge} className="group-data-[state=collapsed]:hidden">Fixture environment</div>
            <Default/>
        </>
    );
}
