import { Widget, WidgetLayoutItem } from "@/types";
import { apiHttp } from "@/lib/http-client";

export interface WidgetsLayouts {
    lg: WidgetLayoutItem[],
    md: WidgetLayoutItem[],
    sm: WidgetLayoutItem[],
    xs: WidgetLayoutItem[],
    xxs: WidgetLayoutItem[]
}

export async function initializeWidgets(): Promise<{
    layout: WidgetsLayouts;
    widgets: Widget[];
}> {
    try {
        const storedData = localStorage.getItem('widgetsData');
        let storedWidgets: Widget[] = [];
        let storedLayout: WidgetsLayouts = {
            lg: [],
            md: [],
            sm: [],
            xs: [],
            xxs: []
        };

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                storedWidgets = parsedData.widgets || [];
                storedLayout = parsedData.layout || {
                    lg: [],
                    md: [],
                    sm: [],
                    xs: [],
                    xxs: []
                };
            } catch (e) {
                console.error('Error parsing data from localStorage', e);
            }
        }

        const widgetsDBResponse = await apiHttp.get<{ widgetsDB?: { widgets?: Widget[]; layout?: WidgetsLayouts; defaultWidgets?: string[] } }>(`${window.routePrefix}/widgets-get-all-db`);
        let widgetsDB = widgetsDBResponse.data?.widgetsDB?.widgets as Widget[] ?? [];
        let layoutDB = widgetsDBResponse.data?.widgetsDB?.layout ?? {
            lg: [],
            md: [],
            sm: [],
            xs: [],
            xxs: []
        };
        const defaultWidgetIds = widgetsDBResponse.data?.widgetsDB?.defaultWidgets as string[] ?? [];

        const widgetsResponse = await apiHttp.get<{ widgets: Widget[] }>(`${window.routePrefix}/widgets-get-all`);
        const allWidgets = widgetsResponse.data.widgets as Widget[];

        // Check if user has saved widgets in database (no defaultWidgetIds means user has saved widgets)
        const hasSavedWidgets = widgetsDB.length > 0 && widgetsDB.some(w => w.added === true) && defaultWidgetIds.length === 0;

        let finalWidgetsDB = widgetsDB;
        let finalLayoutDB = layoutDB;

        // If using default widgets, generate layout on frontend
        if (!hasSavedWidgets && defaultWidgetIds.length > 0) {
            const addedWidgets: Widget[] = [];
            let x = 0, y = 0;

            // Mark default widgets as added
            allWidgets.forEach(widget => {
                if (defaultWidgetIds.includes(widget.id.split("__")[0])) {
                    widget.added = true;
                    addedWidgets.push(widget);
                }
            });

            // Generate layout for all breakpoints
            const generatedLayout: WidgetsLayouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };

            addedWidgets.forEach(widget => {
                const w = widget.size?.w || 1;
                const h = widget.size?.h || 1;
                const layoutItem: WidgetLayoutItem = { x, y, w, h, i: widget.id, id: widget.id };

                generatedLayout.lg.push(layoutItem);
                generatedLayout.md.push(layoutItem);
                generatedLayout.sm.push({ ...layoutItem, w: Math.min(w, 4) });
                generatedLayout.xs.push({ ...layoutItem, w: Math.min(w, 3) });
                generatedLayout.xxs.push({ ...layoutItem, w: 2 });

                x += w;
                if (x >= 12) {
                    x = 0;
                    y += h;
                }
            });

            finalWidgetsDB = addedWidgets;
            finalLayoutDB = generatedLayout;

            // Clear localStorage when using defaults
            localStorage.removeItem('widgetsData');
        } else if (hasSavedWidgets && storedData) {
            // Only use localStorage if user has saved widgets in database
            const dbWidgetIds = widgetsDB.map(w => w.id).sort();
            const storedWidgetIds = storedWidgets.map(w => w.id).sort();

            const idsMatch =
                dbWidgetIds.length === storedWidgetIds.length &&
                dbWidgetIds.every((id, index) => id === storedWidgetIds[index]);

            if (idsMatch && storedWidgets.length > 0) {
                finalWidgetsDB = storedWidgets;
                finalLayoutDB = storedLayout;
            }

            // Update localStorage with current data
            const dataToStore = {
                widgets: finalWidgetsDB,
                layout: finalLayoutDB
            };
            localStorage.setItem('widgetsData', JSON.stringify(dataToStore));
        }

        const initWidgets = allWidgets.map(widget => {
            const findItem = finalWidgetsDB.find((e: any) => e.id === widget.id);
            return findItem && findItem.added ? { ...widget, added: true } : widget;
        });

        return {
            layout: finalLayoutDB,
            widgets: initWidgets
        };
    } catch (error) {
        console.error('Error initializing widgets:', error);
        throw error;
    }
}
