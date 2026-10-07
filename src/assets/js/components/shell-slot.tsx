import {Component, type ComponentType, createContext, type ErrorInfo, type ReactNode, useContext, useMemo} from 'react';

/**
 * Parts of the stock layout a context may override (`layout.module`);
 * `Layout` is the whole of it.
 */
export const SHELL_SLOTS = [
    'Layout',
    'Sidebar',
    'SidebarHeader',
    'SidebarContent',
    'SidebarFooter',
    'Header',
    'HeaderStart',
    'HeaderActions',
] as const;

export type ShellSlotName = typeof SHELL_SLOTS[number];

/** Props of a slot override: the part it replaces comes as `Default`. */
export type SlotProps<P extends object = Record<string, unknown>> = P & {
    Default: ComponentType<P>;
};

/** Overrides per slot, outermost last. */
type ShellSlotOverrides = Partial<Record<ShellSlotName, ComponentType<any>[]>>;

const ShellSlotsContext = createContext<ShellSlotOverrides>({});

/**
 * Supplies the overrides of the stock layout parts. `layers` are the loaded
 * override modules in inheritance order: a slot exported by a later module
 * receives the one of an earlier module as `Default`.
 */
export function ShellSlotsProvider({layers, children}: { layers: Record<string, unknown>[]; children: ReactNode }) {
    const overrides = useMemo(() => {
        const result: ShellSlotOverrides = {};
        for (const layer of layers) {
            for (const name of SHELL_SLOTS) {
                const component = layer[name];
                if (typeof component === 'function' || (typeof component === 'object' && component !== null)) {
                    (result[name] ??= []).push(component as ComponentType<any>);
                }
            }
        }
        return result;
    }, [layers]);

    return <ShellSlotsContext.Provider value={overrides}>{children}</ShellSlotsContext.Provider>;
}

/**
 * Keeps a broken override from taking the page down: once it throws while
 * rendering, the part it replaces is drawn instead.
 */
class SlotErrorBoundary extends Component<{ name: ShellSlotName; fallback: () => ReactNode; children: ReactNode }, { failed: boolean }> {
    state = {failed: false};

    static getDerivedStateFromError() {
        return {failed: true};
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[Adminizer] The "${this.props.name}" layout override failed; the inherited part is shown instead`, error, info.componentStack);
    }

    render() {
        return this.state.failed ? this.props.fallback() : this.props.children;
    }
}

/**
 * Renders a part of the stock layout, or its override. The override gets the
 * same props plus `Default` — the part it replaces, so it may wrap it.
 */
export function ShellSlot<P extends object>({name, Default, ...props}: { name: ShellSlotName; Default: ComponentType<P> } & P) {
    const overrides = useContext(ShellSlotsContext)[name];
    const Component = useMemo(() => {
        let current: ComponentType<any> = Default;
        for (const Override of overrides ?? []) {
            const Parent = current;
            const Layer = (layerProps: any) => (
                <SlotErrorBoundary name={name} fallback={() => <Parent {...layerProps}/>}>
                    <Override {...layerProps} Default={Parent}/>
                </SlotErrorBoundary>
            );
            Layer.displayName = `ShellSlot(${name})`;
            current = Layer;
        }
        return current;
    }, [overrides, Default, name]);

    return <Component {...(props as P)}/>;
}
