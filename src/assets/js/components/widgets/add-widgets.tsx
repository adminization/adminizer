import {useCallback, useEffect, useState} from "react";
import {Widget} from "@/types";
import {Card, CardFooter, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import { useI18n } from "@/hooks/use-i18n";

interface AddWidget {
    initWidgets: Widget[];
    onAddWidgets: (id: string) => void;
    disabled: boolean
    searchPlaceholder: string
    actionsTitles: Record<string, string>
}

type WidgetGroup = Record<string, { items: Widget[], title: string }>;

type Head = { type: string, title: string };

const AddWidgets = ({initWidgets, onAddWidgets, disabled, searchPlaceholder, actionsTitles}: AddWidget) => {
    const { t } = useI18n();
    const [widgets, setWidgets] = useState<WidgetGroup>({
        switchers: {items: [], title: ''},
        info: {items: [], title: ''},
        actions: {items: [], title: ''},
        links: {items: [], title: ''},
        custom: {items: [], title: ''},
        filters: {items: [], title: ''}
    });

    const [head, setHead] = useState<Head[]>([]);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const newWidgets: WidgetGroup = {
            switchers: {items: [], title: ''},
            info: {items: [], title: ''},
            actions: {items: [], title: ''},
            links: {items: [], title: ''},
            custom: {items: [], title: ''},
            filters: {items: [], title: ''}
        };
        const newHead: Head[] = [];

        for (const widget of initWidgets) {
            if (widget.group === 'filters') {
                newWidgets.filters.items.push(widget);
                if (newHead.find(e => e.type === 'filters')) continue
                newWidgets.filters.title = actionsTitles['Filters']
                newHead.push({type: 'filters', title: actionsTitles['Filters']});
                continue;
            }

            if (widget.type === 'switcher') {
                newWidgets.switchers.items.push(widget);
                if (newHead.find(e => e.type === 'switchers')) continue
                newWidgets.switchers.title = actionsTitles['Switcher']
                newHead.push({type: 'switchers', title: actionsTitles['Switcher']});
            }
            if (widget.type === 'info') {
                newWidgets.info.items.push(widget);
                if (newHead.find(e => e.type === 'info')) continue
                newWidgets.info.title = actionsTitles['Info']
                newHead.push({type: 'info', title: actionsTitles['Info']});
            }
            if (widget.type === 'action') {
                newWidgets.actions.items.push(widget);
                if (newHead.find(e => e.type === 'actions')) continue
                newWidgets.actions.title = actionsTitles['Actions']
                newHead.push({type: 'actions', title: actionsTitles['Actions']});
            }
            if (widget.type === 'link') {
                newWidgets.links.items.push(widget);
                if (newHead.find(e => e.type === 'links')) continue
                newWidgets.links.title = actionsTitles['Fast links']
                newHead.push({type: 'links', title: actionsTitles['Fast links']});
            }
            if (widget.type === 'custom') {
                newWidgets.custom.items.push(widget);
                if (newHead.find(e => e.type === 'custom')) continue
                newWidgets.custom.title = actionsTitles['Custom']
                newHead.push({type: 'custom', title: actionsTitles['Custom']});
            }
        }

        setWidgets(newWidgets);
        setHead(newHead);
    }, [initWidgets]);

    const filteredWidgets = useCallback(() => {
        // if active filter
        if (filter) {
            const filteredGroup = widgets[filter];

            // if search query
            if (search.length >= 1) {
                return {
                    [filter]: {
                        ...filteredGroup,
                        items: filteredGroup.items.filter(e =>
                            e.name.toLowerCase().includes(search.toLowerCase())
                        )
                    }
                };
            }

            // if no search query
            return {[filter]: filteredGroup};
        }

        // if no filter and search query
        if (search.length >= 1) {
            let newWidgets = {
                    search: {
                        items: [] as Widget[],
                        title: t("Search"),
                    }
                };

            for (const key of Object.keys(widgets)) {
                const items = widgets[key].items.filter(e =>
                    e.name.toLowerCase().includes(search.toLowerCase())
                );
                newWidgets.search.items = [...newWidgets.search.items, ...items];
            }
            return newWidgets;
        }

        // If the filter is All and there is no search query - return all widgets
        return widgets;
    }, [widgets, filter, search]);

    const addWidget = useCallback((id: string) => {
        onAddWidgets(id);
    }, [widgets, onAddWidgets]);

    return (
        <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex flex-col gap-4 pl-1">
                <div className="flex gap-x-7 gap-y-2 flex-wrap font-medium text-base md:text-lg">
                    <div
                        className={`cursor-pointer hover:text-primary hover:underline transition-all ${!filter ? 'text-primary underline' : ''}`}
                        onClick={() => setFilter('')}>
                        {actionsTitles['All']}
                    </div>
                    {head.length > 0 && head.map((item: Head) => (
                        <div key={item.type}
                             className={`cursor-pointer hover:text-primary hover:underline transition-all ${filter === item.type ? 'text-primary underline' : ''}`}
                             onClick={() => setFilter(item.type)}>{item.title}</div>
                    ))}
                </div>
                <Input type="search" className="max-w-md" placeholder={searchPlaceholder} value={search}
                       onChange={(e) => setSearch(e.target.value)}/>
            </div>
            <div className="mt-6 flex flex-col gap-6">
                {Object.entries(filteredWidgets()).map(([key, widget]) => (
                    <div key={key}>
                        <h2 className="text-lg lg:text-xl font-medium mb-4">{widget.title}</h2>
                        {widget.items.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                                {widget.items.map(item => (
                                    <Card key={item.id} className="min-h-[225px] min-w-[200px] justify-between">
                                        <CardHeader>
                                            <CardTitle className="flex justify-between items-center gap-2 flex-wrap">
                                                {item.name}
                                                {item.icon && <MaterialIcon name={item.icon} className="text-primary"/>}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardFooter className="justify-end">
                                            {item.added ? (
                                                <Button variant="destructive" onClick={() => addWidget(item.id)}>
                                                    {t("Hide")}
                                                </Button>
                                            ) : (
                                                <Button onClick={() => addWidget(item.id)}>
                                                    {t("Show")}
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">{t("No widgets found")}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
export default AddWidgets;
