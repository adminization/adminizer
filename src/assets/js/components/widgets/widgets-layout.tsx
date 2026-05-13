import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent,
    DialogStackOverlay, DialogStackTitle,
    DialogStackTrigger
} from "@/components/ui/dialog-stack.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Responsive, WidthProvider} from "react-grid-layout";
import {SharedData, Widget, WidgetLayoutItem} from "@/types";
import {initializeWidgets} from "@/lib/widgets-service.ts";
import { adminApi } from "@/lib/admin-api";
import AddWidgets from "@/components/widgets/add-widgets.tsx";
import WidgetItem from "@/components/widgets/widget-item.tsx";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {usePage} from "@inertiajs/react";
import {WidgetsLayouts} from "@/lib/widgets-service.ts";


interface WidgetLayoutProps extends SharedData {
    title: string
    tooltip: string
    notWidgets: string
    notFound: string
    actionsTitles: Record<string, string>
    searchPlaceholder: string
}

const WidgetLayout = () => {
    const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);
    const [layout, setLayout] = useState<WidgetsLayouts>({
        lg: [],
        md: [],
        sm: [],
        xs: [],
        xxs: [],
    });
    const [widgets, setWidgets] = useState<Widget[]>([])
    const [popUpDisabled, setPopUpDisabled] = useState(false)
    const [keyRender, setKeyRender] = useState(0);
    const [loading, setIsLoading] = useState(true)
    const [isDraggable, setIsDraggable] = useState(false)
    const [gridRef, setGridRef] = useState<HTMLDivElement | null>(null);

    const page = usePage<WidgetLayoutProps>()

    // Get the current breakpoint
    const getCurrentBreakpoint = useCallback(() => {
        if (!gridRef) return 'lg'; // fallback

        const width = gridRef.clientWidth;

        if (width >= 1200) return 'lg';
        if (width >= 996) return 'md';
        if (width >= 768) return 'sm';
        if (width >= 480) return 'xs';
        return 'xxs';
    }, [gridRef]);

    useEffect(() => {
        async function loadWidgets() {
            try {
                const {layout: widgetsLayout, widgets: widgetsData} = await initializeWidgets();
                setWidgets(widgetsData)
                setLayout(widgetsLayout)
            } catch (error) {
                console.error('Failed to load widgets:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadWidgets();
    }, []);

    const switchDraggable = useCallback((value: boolean) => {
        setIsDraggable(value)
        if (!value) {
            addWidgetsDB(widgets, layout).then(() => {
                setTimeout(() => {
                    setPopUpDisabled(false);
                }, 300)
            })
        }
    }, [layout, isDraggable])

    const handleLayoutChange = (currentLayout: WidgetLayoutItem[]) => {
        const currentBreakpoint = getCurrentBreakpoint();

        setLayout(prev => {
            const updatedLayout = {...prev};
            const currentLayoutMap = new Map(currentLayout.map(item => [item.i, item]));

            updatedLayout[currentBreakpoint as keyof WidgetsLayouts] =
                updatedLayout[currentBreakpoint as keyof WidgetsLayouts].map(item => {
                    const currentItem = currentLayoutMap.get(item.i);
                    return currentItem ? {...item, x: currentItem.x, y: currentItem.y, w: currentItem.w, h: currentItem.h} : item;
                });

            return updatedLayout;
        });
    };

    const addWidgets = useCallback((id: string) => {
        setPopUpDisabled(true);
        const updatedWidgets = widgets.map(widget =>
            widget.id === id ? {...widget, added: !widget.added} : widget
        );

        const currentLayout = layout.lg;
        const layoutItem = currentLayout.find(e => e.i === id);
        let newLayout: WidgetsLayouts = {...layout};

        if (layoutItem) {
            // Delete the layoutItem from all breakpoints
            for (const breakpoint in newLayout) {
                newLayout[breakpoint as keyof WidgetsLayouts] =
                    newLayout[breakpoint as keyof WidgetsLayouts].filter(e => e.i !== id);
            }
        } else {
            const widget = widgets.find(e => e.id === id);
            const w = widget?.size ? widget.size.w : 1;
            const h = widget?.size ? widget.size.h : 1;

            let x = currentLayout.length === 0 ? 0 :
                ((currentLayout[currentLayout.length - 1].x + currentLayout[currentLayout.length - 1].w) > 8 ||
                (currentLayout[currentLayout.length - 1].x + currentLayout[currentLayout.length - 1].w + w) > 8
                    ? 0
                    : (currentLayout[currentLayout.length - 1].x + currentLayout[currentLayout.length - 1].w));

            const y = 0;

            const newItem = {
                x,
                y,
                w,
                h,
                i: id,
                id: widget?.id as string,
            };

            // Add the newItem to all breakpoints
            for (const breakpoint in newLayout) {
                if (!newLayout[breakpoint as keyof WidgetsLayouts].some(item => item.i === id)) {
                    newLayout[breakpoint as keyof WidgetsLayouts] = [
                        ...newLayout[breakpoint as keyof WidgetsLayouts],
                        {...newItem}
                    ];
                }
            }
        }

        setWidgets(updatedWidgets);
        setLayout(newLayout);
        setKeyRender(prev => prev + 1);

        addWidgetsDB(updatedWidgets, newLayout).then(() => {
            setTimeout(() => {
                setPopUpDisabled(false);
            }, 300);
        });
    }, [layout, widgets]);

    const addWidgetsDB = useCallback(async (updatedWidgets: Widget[], newLayout: WidgetsLayouts) => {
        try {
            const storeWidgets = updatedWidgets.filter(widget => widget.added === true)
            await adminApi.post(`${window.routePrefix}/widgets-get-all-db`, {
                widgets: storeWidgets,
                layout: newLayout
            });
            const dataToStore = {
                widgets: storeWidgets,
                layout: newLayout
            };
            localStorage.setItem('widgetsData', JSON.stringify(dataToStore));
        } catch (e) {
            console.log(e);
        }
    }, [widgets])

    return (
        <div
            className={`flex h-full flex-1 flex-col gap-4 rounded-xl p-4 `}>
            {loading ? (
                <div>
                    <Skeleton className="h-8 w-full rounded-md"/>
                    <div className="flex flex-wrap mt-8 gap-6">
                        <Skeleton className="h-20 w-40 rounded-md"/>
                        <Skeleton className="h-30 w-80 rounded-md"/>
                        <Skeleton className="h-40 w-50 rounded-md"/>
                        <Skeleton className="h-40 w-50 rounded-md"/>
                        <Skeleton className="h-24 w-60 rounded-md"/>
                        <Skeleton className="h-32 w-70 rounded-md"/>
                        <Skeleton className="h-28 w-45 rounded-md"/>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mr-16">
                        <h1 className="font-bold text-xl">{page.props.title}</h1>
                        <div className="flex gap-4 items-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline"
                                                className="rounded-full !p-2 size-6 cursor-pointer">?</Button>
                                    </TooltipTrigger>
                                    <TooltipContent align="end" side="bottom">
                                        <p>{page.props.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <Switch className="cursor-pointer" checked={isDraggable} onCheckedChange={switchDraggable}/>

                            <DialogStack>
                                <DialogStackTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MaterialIcon name="add_box" className="text-primary"/>
                                    </Button>
                                </DialogStackTrigger>
                                <DialogStackOverlay/>
                                <DialogStackBody>
                                    <DialogStackContent>
                                        <div className="h-full">
                                            <DialogStackTitle
                                                className="font-bold leading-none tracking-tight py-4 mr-8 sticky border-b text-xl">
                                                {page.props.title}
                                            </DialogStackTitle>
                                            <div className="overflow-auto h-[calc(100%-64px)] pr-4 pt-4">
                                                <AddWidgets initWidgets={widgets} onAddWidgets={addWidgets}
                                                            disabled={popUpDisabled}
                                                            searchPlaceholder={page.props.searchPlaceholder}
                                                            actionsTitles={page.props.actionsTitles}/>
                                            </div>
                                        </div>
                                    </DialogStackContent>
                                </DialogStackBody>
                            </DialogStack>
                        </div>
                    </div>
                    <div ref={setGridRef}>
                        {layout.lg.length > 0 ? (
                            <ResponsiveGridLayout
                                //@ts-ignore
                                layouts={layout}
                                breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}}
                                cols={{lg: 8, md: 6, sm: 4, xs: 2, xxs: 1}}
                                rowHeight={131}
                                //@ts-ignore
                                onDragStop={handleLayoutChange}
                                isResizable={false}
                                isDraggable={isDraggable}
                                key={keyRender}
                                className="overflow-hidden max-w-[1440px]"
                            >
                                {layout.lg.map((widget) => (
                                    <div key={widget.i}>
                                        <WidgetItem draggable={isDraggable} widgets={widgets} ID={widget.id}/>
                                    </div>
                                ))}
                            </ResponsiveGridLayout>
                        ) : (
                            <p className="text-center mt-8 text-muted-foreground">{page.props.notWidgets}</p>
                        )}
                    </div>
                </>
            )}

        </div>
    )
}

export default WidgetLayout
