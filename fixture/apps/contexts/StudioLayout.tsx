import {type CSSProperties} from "react";
import {Link, usePage} from "@inertiajs/react";
import {type LayoutProps, useAdminContext} from "@/shell";

const bar: CSSProperties = {
    display: "flex", alignItems: "center", gap: 20, height: 52, padding: "0 20px",
    background: "#18181b", color: "#fafafa", fontSize: 14, flexShrink: 0,
    // Narrow screens scroll the bar instead of overflowing the page.
    overflowX: "auto", whiteSpace: "nowrap",
};
const select: CSSProperties = {
    background: "#27272a", color: "inherit", border: "1px solid #3f3f46", borderRadius: 6, padding: "4px 8px",
};

/**
 * Fully custom layout (the `Layout` part): nothing of the stock shell is
 * reused. Navigation and the context switcher come from `useAdminContext()`.
 */
export function Layout({children}: LayoutProps) {
    const {auth, logout, logoutBtn} = usePage<any>().props;
    const {context, contexts, menu, isActive, switchTo} = useAdminContext();

    return (
        <div style={{display: "flex", flexDirection: "column", height: "100svh"}}>
            <header style={bar}>
                <strong style={{letterSpacing: 1}}>▶ STUDIO</strong>
                <nav style={{display: "flex", gap: 4, flex: 1}}>
                    {menu.map((item) => {
                        const active = isActive(item.link);
                        return (
                            <Link key={item.id} href={item.link} style={{
                                padding: "6px 12px", borderRadius: 6,
                                background: active ? "#fafafa" : "transparent",
                                color: active ? "#18181b" : "inherit",
                            }}>
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
                <select style={select} value={context?.id} onChange={(event) => switchTo(event.target.value)}>
                    {contexts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
                <span style={{opacity: 0.7}}>{auth?.user?.login}</span>
                <a href={logout} style={{opacity: 0.7}}>{logoutBtn}</a>
            </header>
            <main data-scroll-region="content" style={{flex: 1, minHeight: 0, overflowY: "auto", background: "var(--background)"}}>
                {children}
            </main>
        </div>
    );
}
