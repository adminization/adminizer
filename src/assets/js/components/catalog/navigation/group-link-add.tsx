import {NavGroupAddProps} from "@/types";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Button} from "@/components/ui/button.tsx";
import React, {useState, useEffect} from "react";
import axios from "axios";
import {LoaderCircle} from "lucide-react";

const GroupLinkAdd = ({update = false, type, parentId, ...data}: NavGroupAddProps) => {
    // Initializing the Form State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [targetBlank, setTargetBlank] = useState<boolean>(false);
    const [visible, setVisible] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        console.log(data)
    }, []);

    // Initializing a form with data when mounting or changing data.item
    useEffect(() => {
        if (data.item) {
            setFormData({
                name: data.item.name || '',
                ...Object.fromEntries(
                    data.items.map(item => [item.name, data.item ? data.item[item.name] : ''])
                )
            });
            setTargetBlank(data.item.targetBlank || false);
            setVisible(data.item.visible || false);
        } else {
            // Resetting the form to create a new element
            setFormData({
                name: '',
                ...Object.fromEntries(data.items.map(item => [item.name, '']))
            });
            setTargetBlank(false);
            setVisible(false)
        }
    }, [data.item, data.items]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let res = null

            if (update) {
                res = await axios.put('', {
                    type: data.item?.type,
                    modelId: data.item?.id,
                    data: {
                        ...data.item,
                        ...formData,
                        targetBlank,
                        visible
                    },
                    _method: 'updateItem'
                });
                data.callback(res.data.data);
            } else {
                await axios.post('', {
                    data: {
                        ...formData,
                        targetBlank,
                        visible,
                        parentId: parentId,
                        type: type
                    },
                    _method: 'createItem'
                });
                data.callback(null);
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
                <div className="flex gap-4 items-center">
                    <Checkbox
                        id="targetBlank"
                        checked={targetBlank}
                        onCheckedChange={(checked) => setTargetBlank(!!checked)}
                        className="cursor-pointer size-5"
                    />
                    <Label htmlFor="targetBlank">{data.labels.openInNewWindow}</Label>
                </div>
                <div className="flex gap-4 items-center">
                    <Checkbox
                        id="visible"
                        checked={visible}
                        onCheckedChange={(checked) => setVisible(!!checked)}
                        className="cursor-pointer size-5"
                    />
                    <Label htmlFor="visible">{data.labels.visible}</Label>
                </div>

                <div className="grid gap-4">
                    <Label htmlFor="name">{data.labels.title}</Label>
                    <Input
                        required
                        value={formData.name || ''}
                        name="name"
                        placeholder={data.labels.title}
                        onChange={handleChange}
                    />
                </div>

                {data.items.map(item => (
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

            <Button className="mt-8 w-fit" form="group-add" type="submit" disabled={isLoading}>
                {data.labels.save}
                {isLoading && <LoaderCircle className="h-4 w-4 animate-spin ml-2"/>}
            </Button>
        </div>
    );
};

export default GroupLinkAdd;