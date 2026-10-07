import {type ComponentType, type ReactNode, useEffect, useMemo} from 'react';
import {Head, usePage} from '@inertiajs/react';
import {LoaderCircle} from 'lucide-react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import {SHELL_SLOTS, ShellSlot, ShellSlotsProvider} from '@/components/shell-slot';
import {type RemoteModule, useRemoteModules} from '@/hooks/use-remote-modules';
import {type AdminContextInfo, type AdminContextLayer, type BreadcrumbItem, type SharedData} from '@/types';
import {cn} from '@/lib/utils';

interface ContextLayoutHostProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

/** Props of a whole layout: the stock one, `none`, or a `Layout` override. */
export interface LayoutProps {
    children: ReactNode;
    breadcrumbs: BreadcrumbItem[];
    className?: string;
    context?: AdminContextInfo;
}

type ResolvedLayout = AdminContextInfo['layout'];

const STOCK: ResolvedLayout = {root: 'stock', layers: [], stylesheets: []};

/** The layout as sent by the server; anything it does not recognize is the stock layout. */
function readLayout(layout: unknown): ResolvedLayout {
    if (!layout || typeof layout !== 'object') return STOCK;
    const {root, layers, stylesheets} = layout as Partial<ResolvedLayout>;
    return {
        root: root === 'none' ? 'none' : 'stock',
        layers: Array.isArray(layers) ? layers.filter((layer) => typeof layer?.module === 'string') : [],
        stylesheets: Array.isArray(stylesheets) ? stylesheets.filter((href) => typeof href === 'string') : [],
    };
}

/** The slot overrides of a loaded layer; a `{component}` module's default export is its `Layout`. */
function toSlots(layer: AdminContextLayer, module: RemoteModule): Record<string, unknown> {
    const slots: Record<string, unknown> = {};
    for (const name of SHELL_SLOTS) {
        if (module[name] !== undefined) slots[name] = module[name];
    }
    if (layer.default === 'Layout' && module.default !== undefined) slots.Layout = module.default;
    return slots;
}

/** No shell: the page fills the window. */
function NoLayout({children, className}: LayoutProps) {
    return (
        <div data-scroll-region="content" className={cn('flex min-h-svh w-full flex-col', className)}>
            {children}
        </div>
    );
}

function Loader({head}: { head: ReactNode }) {
    return (
        <div className="flex h-svh w-full items-center justify-center">
            {head}
            <LoaderCircle className="size-10 animate-spin text-neutral-500"/>
        </div>
    );
}

const NO_LAYERS: Record<string, unknown>[] = [];

/**
 * Draws the layout of the layout context the page belongs to
 * (`adminContext.layout` shared prop): the context's override modules applied
 * in order over the stock shell or over no shell at all. A `Layout` override
 * replaces the whole layout and receives `children`, `breadcrumbs`,
 * `className` and `context`. A module that fails to load is skipped.
 */
export function ContextLayoutHost({children, breadcrumbs = [], className}: ContextLayoutHostProps) {
    const page = usePage<SharedData>();
    const context = page.props.adminContext;
    const layout = readLayout(context?.layout);
    const urls = useMemo(() => layout.layers.map((layer) => layer.module), [layout.layers.map((layer) => layer.module).join('\n')]);
    const loaded = useRemoteModules(urls, layout.stylesheets);
    // The URLs and the number of loaded modules identify the layers.
    const layers = useMemo(
        () => loaded.modules
            ? loaded.modules.flatMap((module, index) => module ? [toSlots(layout.layers[index], module)] : [])
            : NO_LAYERS,
        [urls, loaded.modules?.length, loaded.loading],
    );

    useEffect(() => {
        loaded.errors.forEach((error) => console.error('[Adminizer] Failed to load a context layout module', error));
    }, [loaded.errors]);

    const head = <Head title={page.props.title as string}/>;
    if (loaded.loading) return <Loader head={head}/>;

    // Crumbs given by the page component win over the ones sent by the server.
    const crumbs = breadcrumbs.length ? breadcrumbs : (page.props.breadcrumbs ?? []);
    const Root: ComponentType<LayoutProps> = layout.root === 'none' ? NoLayout : AppSidebarLayout;
    // The stock layout sets the title itself; anything replacing it may not.
    const replaced = layout.root === 'none' || layers.some((layer) => layer.Layout !== undefined);

    return (
        <ShellSlotsProvider layers={layers}>
            {replaced && head}
            <ShellSlot name="Layout" Default={Root} breadcrumbs={crumbs} className={className} context={context}>
                {children}
            </ShellSlot>
        </ShellSlotsProvider>
    );
}
