import React, { useEffect, useRef, useState } from 'react';
import { adminApi } from "@/lib/admin-api";
import { getDefaultColorByID } from "./colorPallete.ts";
import { Widget as WidgetData } from "@/types";
import MaterialIcon from "@/components/material-icon.tsx";
import { router } from "@inertiajs/react";
import { ComponentType } from "@/pages/module.tsx";
import { LoaderCircle } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";

type WidgetType = 'info' | 'switcher' | 'action' | 'link' | 'custom' | undefined;

interface WidgetProps {
    widgets: WidgetData[];
    draggable: boolean;
    ID: string;
}

interface WidgetState {
    name: string | null;
    info: string | null;
    description: string | null;
    icon: string;
    backgroundColor: string;
    state: boolean | null;
    scriptUrl: string
}

const WidgetItem: React.FC<WidgetProps> = ({ widgets, draggable, ID }) => {
    const { t } = useI18n();
    const [widgetType, setWidgetType] = useState<WidgetType>(undefined);
    const [widgetState, setWidgetState] = useState<WidgetState>({
        name: null,
        info: null,
        description: null,
        icon: 'box',
        backgroundColor: '',
        state: null,
        scriptUrl: '',
    });

    const [Component, setComponent] = useState<React.ReactElement | null>(null);
    const [isActionPending, setIsActionPending] = useState(false);

    const widgetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentWidget = widgets.find((e) => e.id === ID);
        if (!currentWidget) return;

        const newType = currentWidget.type;
        setWidgetType(newType);
        setWidgetState((prev) => ({
            ...prev,
            name: currentWidget.name,
            description: currentWidget.description,
            icon: currentWidget.icon || 'widgets',
            backgroundColor: currentWidget.backgroundCSS || getDefaultColorByID(ID),
            scriptUrl: currentWidget.scriptUrl || '',
        }));

        switch (newType) {
            case 'info':
                if (currentWidget.api) getInfo(currentWidget.api);
                break;
            case 'switcher':
                if (currentWidget.api) getState(currentWidget.api);
                break;
            case 'custom':
                const initModule = async () => {
                    const Module = await import(/* @vite-ignore */ currentWidget.scriptUrl as string);
                    const Component = Module.default as ComponentType['default'];
                    setComponent(<Component />);
                }
                initModule();
                break;
            default:
                break;
        }
    }, [widgets, ID]);

    const getInfo = async (api: string) => {
        try {
            const response = await adminApi.get<any>(api);
            setWidgetState((prev) => ({ ...prev, info: response.data }));
        } catch (error) {
            console.error('Error fetching widget info:', error);
        }
    };

    const getState = async (api: string) => {
        try {
            const response = await adminApi.get<{ state: boolean }>(api);
            setWidgetState((prev) => ({ ...prev, state: response.data.state }));
        } catch (error) {
            console.error('Error fetching widget state:', error);
        }
    };

    const handleLinkWidget = () => {
        const widget = widgets.find((e) => e.id === ID);
        if (!widget?.link) return;

        if (widget?.linkType === 'self') {
            router.visit(widget.link);
        } else {
            window.open(widget.link, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSwitcherWidget = async (api: string) => {
        try {
            const response = await adminApi.post<{ state: boolean }>(api);
            setWidgetState((prev) => ({ ...prev, state: response.data.state }));
        } catch (error) {
            console.error('Error switching widget state:', error);
        }
    };

    const handleActionWidget = async (api: string) => {
        setIsActionPending(true);
        try {
            await adminApi.post(api);
            toast.success(t("Action completed"));
        } catch (error) {
            console.error('Error performing widget action:', error);
            toast.error(t("Action failed"));
        } finally {
            setIsActionPending(false);
        }
    };

    const widgetAction = async () => {
        if (!widgetType || draggable || isActionPending) return;

        // Check if info widget has a link
        const widget = widgets.find((e) => e.id === ID);
        if (widgetType === 'info' && !widget?.link) return;

        const widgetElement = widgetRef.current;
        if (!widgetElement) return;

        widgetElement.classList.add('widget--switching');

        try {
            const api = widgets.find((e) => e.id === ID)?.api;

            switch (widgetType) {
                case 'info':
                case 'link':
                    handleLinkWidget();
                    break;
                case 'switcher':
                    if (api) await handleSwitcherWidget(api);
                    break;
                case 'action':
                    if (api) await handleActionWidget(api);
                    break;
                default:
                    break;
            }
        } finally {
            widgetElement.classList.remove('widget--switching');
        }
    };

    const getWidgetClass = (): string => {
        if (draggable) return 'widget-flexible--flex';
        const widget = widgets.find((e) => e.id === ID);
        const hasLink = widgetType === 'info' && widget?.link;
        const actionClass = (widgetType !== 'info' || hasLink) ? 'cursor-pointer hover:brightness-110' : '';
        return isActionPending ? `${actionClass} pointer-events-none opacity-60` : actionClass;
    };

    const renderWidgetContent = () => {
        switch (widgetType) {
            case 'info':
                return <div>{widgetState.info}</div>;
            case 'switcher':
                return <span className="text-lg font-bold">{widgetState.state ? t("On") : t("Off")}</span>;
            default:
                return null;
        }
    };

    return (
        <>
            {widgetType === 'custom' ? (
                <div className="flex justify-center items-center w-full h-full rounded-md border" style={{ backgroundColor: widgetState.backgroundColor }}>
                    {Component ||
                        <LoaderCircle className="size-10 animate-spin text-neutral-500" />}
                </div>
            ) : (
                <div
                    id={ID}
                    className={`relative transition rounded-md birder w-full h-full ${getWidgetClass()}`}
                    style={{ backgroundColor: widgetState.backgroundColor }}
                    onClick={widgetAction}
                    ref={widgetRef}
                >
                    {isActionPending && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/20">
                            <LoaderCircle className="size-8 animate-spin text-white" />
                        </div>
                    )}
                    <div className="text-amber-50 flex flex-col justify-between gap-2.5 p-3 w-full h-full">
                        <div>
                            <span className="font-bold">{widgetState.name}</span>
                            <p className="text-sm">{widgetState.description}</p>
                        </div>
                        <div className="flex items-end justify-between gap-5">
                            {renderWidgetContent()}
                            <span className="admin-widgets__icon">
                                <MaterialIcon name={widgetState.icon} />
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default WidgetItem;
