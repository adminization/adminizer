import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React, {useState, useEffect} from "react";
import axios from "@/lib/axios-compat";
import {LoaderCircle} from "lucide-react";
import type {CatalogTemplateComponentProps} from "@/types";

interface LegacyItemProps {
    update?: boolean,
    parentId?: string | number,
    item?: Record<string, any>
    items: {
        name: string,
        required: boolean
    }[],
    callback?: (item: any) => void
}

type GroupProps = LegacyItemProps | CatalogTemplateComponentProps;

function isTemplateProps(props: GroupProps): props is CatalogTemplateComponentProps {
    return "mode" in props && "template" in props && "actions" in props;
}

const Group = (props: GroupProps) => {
    const templateProps = isTemplateProps(props) ? props : null;
    const legacyProps = templateProps ? null : props;
    const update = templateProps ? templateProps.mode === "update" : legacyProps?.update ?? false;
    const parentId = templateProps ? templateProps.parentId : legacyProps?.parentId;
    const item = templateProps ? templateProps.template.data.item : legacyProps?.item;

    const [title, setTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (item) {
            setTitle(item.title ?? item.name ?? '');
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value)
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let res = null

            if (update) {
                res = await axios.put<any>('', {
                    type: 'group',
                    modelId: item?.id,
                    data: {
                        ...item,
                        name: title,
                        title: title
                    },
                    _method: 'updateItem'
                });
                if (templateProps) {
                    templateProps.actions.close();
                    await templateProps.actions.reload(res.data.data);
                } else {
                    legacyProps?.callback?.(res.data.data);
                }
            } else {
                await axios.post('', {
                    data: {
                        title: title,
                        parentId: parentId,
                        type: 'group'
                    },
                    _method: 'createItem'
                });
                if (templateProps) {
                    templateProps.actions.close();
                    await templateProps.actions.reload(null);
                } else {
                    legacyProps?.callback?.(null);
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8">
            <form className="grid gap-6" id="group-add" onSubmit={handleSubmit}>
                <div className="grid gap-4">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        required
                        value={title}
                        name="title"
                        placeholder="Title"
                        onChange={handleChange}
                    />
                </div>
            </form>

            <Button className="mt-8 w-fit" form="group-add" type="submit" disabled={isLoading}>
                Save
                {isLoading && <LoaderCircle className="h-4 w-4 animate-spin ml-2"/>}
            </Button>
        </div>
    );
};

export default Group;
