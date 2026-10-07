/**
 * Stock parts of the admin shell a context layout may reuse, and the hook
 * reading the context of the page.
 * In the browser the same set is available as `window.AdminizerShell`;
 * external bundles map `@/shell` to it.
 */
export {default as AppShell} from '@/components/app-shell';
export {default as DefaultLayout} from '@/layouts/app/app-sidebar-layout';
export {AppSidebar} from '@/components/app-sidebar';
export {AppSidebarHeader} from '@/components/app-sidebar-header';
export {ContextSwitcher} from '@/components/context-switcher';
export {NavMain} from '@/components/nav-main';
export {NavUser} from '@/components/nav-user';
export {Breadcrumbs} from '@/components/breadcrumbs';
export {GlobalSearch} from '@/components/global-search';
export {ThemeSwitcher} from '@/components/theme-switcher';
export {UserInfo} from '@/components/user-info';
export {UserMenuContent} from '@/components/user-menu-content';
export {default as MaterialIcon} from '@/components/material-icon';
export {useAdminContext} from '@/hooks/use-admin-context';
export type {SlotProps, ShellSlotName} from '@/components/shell-slot';
export type {LayoutProps} from '@/layouts/context-layout-host';
export type {AdminContextInfo, AdminContextLayer} from '@/types';
