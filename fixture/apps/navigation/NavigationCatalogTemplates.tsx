import React, {useEffect, useState} from "react";
import AddForm from "@/components/add-form";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {AddCatalogProps, CatalogTemplateComponentProps} from "@/types";
import {LoaderCircle, Plus} from "lucide-react";
import axios from "@/lib/axios-compat";

export function NavigationModelLinkTemplate(props: CatalogTemplateComponentProps) {
    if (props.mode === "update") {
        return <NavigationModelLinkEditTemplate {...props}/>;
    }

    return <NavigationModelLinkCreateTemplate {...props}/>;
}

function NavigationModelLinkCreateTemplate({template, itemType, parentId, actions}: CatalogTemplateComponentProps) {
    const [targetBlank, setTargetBlank] = useState(false);
    const [visible, setVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const data = template.data;

    const handleSelect = async (value: string) => {
        try {
            setIsSubmitting(true);
            const res = await axios.post("", {
                data: {
                    record: value,
                    parentId,
                    targetBlank,
                    visible,
                    _method: "select",
                    type: itemType,
                },
                _method: "createItem",
            });
            if (res.data) {
                actions.close();
                await actions.reload(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex gap-4 flex-col">
                <div className={`grid gap-4 ${!data.items.length ? "opacity-50 pointer-events-none" : ""}`}>
                    <Label>{data.labels.selectTitle}</Label>
                    <Select onValueChange={handleSelect} disabled={isSubmitting}>
                        <SelectTrigger className="w-full max-w-[170px] cursor-pointer">
                            <SelectValue placeholder={data.labels.selectTitle}/>
                        </SelectTrigger>
                        <SelectContent className="z-[1003]">
                            {data.items.map((item: { id: number | string; name: string }) => (
                                <SelectItem value={item.id.toString()} key={`${item.id}-${item.name}`}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <NavigationFlags
                    labels={data.labels}
                    targetBlank={targetBlank}
                    visible={visible}
                    onTargetBlankChange={setTargetBlank}
                    onVisibleChange={setVisible}
                />
            </div>
            <div className="mt-8">
                <span><b>{data.labels.OR}</b></span>
            </div>
            <Button className="mt-8" onClick={() => actions.openModelAdd(data.model)}>
                <Plus/>
                {data.labels.createTitle}
            </Button>
        </div>
    );
}

function NavigationModelLinkEditTemplate({template, selectedItem, messages, actions}: CatalogTemplateComponentProps) {
    const [addProps, setAddProps] = useState<AddCatalogProps | null>(null);
    const item = template.data.item;
    const model = template.data.model ?? item.type ?? selectedItem?.type;

    useEffect(() => {
        const loadModelForm = async () => {
            const res = await axios.get<any>(`${window.routePrefix}/model/${model}/edit/${item.modelId}?without_layout=true`);
            setAddProps(res.data);
        };
        loadModelForm().catch(console.error);
    }, [item.modelId, model]);

    const updateModelLink = async (record: any, targetBlank?: boolean, visible?: boolean) => {
        const updatedRecord = record[0];
        updatedRecord.targetBlank = targetBlank;
        updatedRecord.visible = visible;
        updatedRecord.treeId = item.id;

        const res = await axios.put<any>("", {
            type: item.type,
            data: {record: updatedRecord},
            modelId: item.modelId,
            _method: "updateItem",
        });

        actions.close();
        await actions.reload(res.data.data);
    };

    if (!addProps) {
        return <LoaderCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>;
    }

    return (
        <AddForm
            page={addProps as any}
            catalog={true}
            callback={updateModelLink}
            openNewWindowLabel={messages["Open in a new window"]}
            visibleLable={messages["Visible"]}
            openNewWindow={item.targetBlank}
            DnavVisible={item.visible}
            isNavigation={true}
        />
    );
}

export function NavigationGroupTemplate(props: CatalogTemplateComponentProps) {
    return <NavigationGroupLinkTemplate {...props} templateType="group"/>;
}

export function NavigationLinkTemplate(props: CatalogTemplateComponentProps) {
    return <NavigationGroupLinkTemplate {...props} templateType="link"/>;
}

function NavigationGroupLinkTemplate({
    mode,
    template,
    parentId,
    actions,
    templateType,
}: CatalogTemplateComponentProps & { templateType: "group" | "link" }) {
    const data = template.data;
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [targetBlank, setTargetBlank] = useState(false);
    const [visible, setVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (data.item) {
            setFormData({
                name: data.item.name || "",
                ...Object.fromEntries(data.items.map((item: { name: string }) => [
                    item.name,
                    data.item ? data.item[item.name] : "",
                ])),
            });
            setTargetBlank(data.item.targetBlank || false);
            setVisible(data.item.visible || false);
            return;
        }

        setFormData({
            name: "",
            ...Object.fromEntries(data.items.map((item: { name: string }) => [item.name, ""])),
        });
        setTargetBlank(false);
        setVisible(false);
    }, [data.item, data.items]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (mode === "update") {
                const res = await axios.put<any>("", {
                    type: data.item?.type,
                    modelId: data.item?.id,
                    data: {
                        ...data.item,
                        ...formData,
                        targetBlank,
                        visible,
                    },
                    _method: "updateItem",
                });
                actions.close();
                await actions.reload(res.data.data);
                return;
            }

            await axios.post("", {
                data: {
                    ...formData,
                    targetBlank,
                    visible,
                    parentId,
                    type: templateType,
                },
                _method: "createItem",
            });
            actions.close();
            await actions.reload(null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8">
            <form className="grid gap-6" id="navigation-group-link-template" onSubmit={handleSubmit}>
                <NavigationFlags
                    labels={data.labels}
                    targetBlank={targetBlank}
                    visible={visible}
                    onTargetBlankChange={setTargetBlank}
                    onVisibleChange={setVisible}
                />

                <div className="grid gap-4">
                    <Label htmlFor="name">{data.labels.title}</Label>
                    <Input
                        required
                        value={formData.name || ""}
                        name="name"
                        placeholder={data.labels.title}
                        onChange={handleChange}
                    />
                </div>

                {data.items.map((item: { name: string; label: string; required: boolean }) => (
                    <div className="grid gap-4" key={item.name}>
                        <Label>{item.label}</Label>
                        <Input
                            required={item.required}
                            value={formData[item.name] || ""}
                            name={item.name}
                            placeholder={item.label}
                            onChange={handleChange}
                        />
                    </div>
                ))}
            </form>

            <Button className="mt-8 w-fit" form="navigation-group-link-template" type="submit" disabled={isLoading}>
                {data.labels.save}
                {isLoading && <LoaderCircle className="h-4 w-4 animate-spin ml-2"/>}
            </Button>
        </div>
    );
}

function NavigationFlags({
    labels,
    targetBlank,
    visible,
    onTargetBlankChange,
    onVisibleChange,
}: {
    labels: Record<string, string>;
    targetBlank: boolean;
    visible: boolean;
    onTargetBlankChange: (value: boolean) => void;
    onVisibleChange: (value: boolean) => void;
}) {
    return (
        <>
            <div className="flex gap-4 items-center">
                <Checkbox
                    id="targetBlank"
                    checked={targetBlank}
                    onCheckedChange={(checked) => onTargetBlankChange(!!checked)}
                    className="cursor-pointer size-5"
                />
                <Label htmlFor="targetBlank">{labels.openInNewWindow}</Label>
            </div>
            <div className="flex gap-4 items-center">
                <Checkbox
                    id="visible"
                    checked={visible}
                    onCheckedChange={(checked) => onVisibleChange(!!checked)}
                    className="cursor-pointer size-5"
                />
                <Label htmlFor="visible">{labels.visible}</Label>
            </div>
        </>
    );
}
