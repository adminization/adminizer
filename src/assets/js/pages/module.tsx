import {usePage} from "@inertiajs/react";
import {SharedData} from "@/types";
import {FC, useState, useEffect} from "react";
import {withAppLayout} from "@/layouts/with-app-layout";
import {LoaderCircle} from "lucide-react";

export interface ComponentType {
    default: FC<{ data?: any }>;
}

const getModuleImportUrl = (moduleComponent: string): string => {
    if (!import.meta.env.DEV) {
        return moduleComponent;
    }

    const separator = moduleComponent.includes('?') ? '&' : '?';
    return `${moduleComponent}${separator}t=${Date.now()}`;
};

function Module() {
    const page = usePage<SharedData>();
    // The component *type* is stored, not a rendered element: props are read on
    // every render below, so partial reloads and preserveState visits reach the
    // module instead of the props captured when the bundle was first imported.
    const [Component, setComponent] = useState<ComponentType["default"] | null>(null);

    useEffect(() => {
        const initModule = async () => {
            // Loading the JS component
            const moduleComponent = getModuleImportUrl(page.props.moduleComponent as string);
            const Module = await import(/* @vite-ignore */ moduleComponent);
            // Updater form: a component is a function, and useState would call it.
            setComponent(() => Module.default as ComponentType["default"]);
        };

        // Load CSS if the path is passed
        const loadCSS = () => {
            const cssPath = page.props.moduleComponentCSS as string | undefined;
            if (!cssPath) return;

            // Let's check if it has already been added
            if ([...document.head.querySelectorAll("link[rel='stylesheet']")].some(link => (link as HTMLLinkElement).href.includes(cssPath))) {
                return;
            }

            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = cssPath;
            link.type = "text/css";
            link.onload = () => console.log(`CSS loaded: ${cssPath}`);
            link.onerror = () => console.error(`Failed to load CSS: ${cssPath}`);
            document.head.appendChild(link);
        };

        loadCSS();
        initModule();
    }, []);

    const { moduleComponent: _mc, moduleComponentCSS: _css, ...componentProps } = page.props as any;
    // `moduleLayout: 'bare'` drops the content margin: the wrapper leaves the
    // layout (`display: contents`) and the module root becomes a direct child of
    // the scroll container. Absent → today's margin.
    const bare = page.props.moduleLayout === 'bare';

    return (
        <div className={bare ? 'contents' : 'm-2 md:m-5'}>
            {Component ? (
                <Component {...componentProps} />
            ) : (
                <LoaderCircle className="size-10 animate-spin text-neutral-500 mx-auto mt-[15%]"/>
            )}
        </div>
    );
}

export default withAppLayout(Module);
