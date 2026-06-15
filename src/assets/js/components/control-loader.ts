import {
    createElement,
    type ComponentType,
    useEffect,
    useState,
} from "react";

type ControlModule<TProps extends object> = {
    default: ComponentType<TProps>;
    Component?: ComponentType<TProps>;
};

const stylesheetPromises = new Map<string, Promise<void>>();

export function loadControlStylesheet(cssPath?: string): Promise<void> {
    if (!cssPath) {
        return Promise.resolve();
    }

    const absoluteUrl = new URL(cssPath, window.location.href).href;
    const existing = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    ).find((link) => link.href === absoluteUrl);
    if (existing) {
        return Promise.resolve();
    }

    const cached = stylesheetPromises.get(absoluteUrl);
    if (cached) {
        return cached;
    }

    const promise = new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = absoluteUrl;
        link.onload = () => resolve();
        link.onerror = () => {
            stylesheetPromises.delete(absoluteUrl);
            reject(new Error(`Failed to load control stylesheet: ${absoluteUrl}`));
        };
        document.head.appendChild(link);
    });

    stylesheetPromises.set(absoluteUrl, promise);
    return promise;
}

export async function loadControlModule<TProps extends object>(
    modulePath: string,
    cssPath?: string
): Promise<ControlModule<TProps>> {
    const stylesheet = loadControlStylesheet(cssPath).catch((error) => {
        console.error(error);
    });
    const module = await import(/* @vite-ignore */ modulePath) as ControlModule<TProps>;
    await stylesheet;

    return module;
}

export function createLazyControl<TProps extends object>(
    modulePath: () => string,
    cssPath: () => string | undefined,
    exportName: "default" | "Component" = "default"
): ComponentType<TProps> {
    return function LazyControlProxy(props: TProps) {
        const [Component, setComponent] = useState<ComponentType<TProps> | null>(null);

        useEffect(() => {
            let active = true;

            void loadControlModule<TProps>(modulePath(), cssPath()).then((module) => {
                const component = exportName === "Component" ? module.Component : module.default;
                if (!component) {
                    throw new Error(`Control module does not export "${exportName}"`);
                }
                if (active) {
                    setComponent(() => component);
                }
            });

            return () => {
                active = false;
            };
        }, []);

        return Component ? createElement(Component, props) : null;
    };
}
