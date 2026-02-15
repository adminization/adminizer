import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import React, {useState, useEffect} from "react";
import axios from "axios";
import {LoaderCircle} from "lucide-react";

interface ItemProps{
    update: boolean,
    parentId: string,
    item?: Record<string, any>
    items: {
        name: string,
        required: boolean
    }[],
    callback: (item: any) => void
}

const Group = ({update = false, parentId, ...data}: ItemProps) => {
    // Initializing the Form State
    const [title, setTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Initializing a form with data when mounting or changing data.item

    useEffect(() => {
        if (data.item) {
            setTitle(data.item.title);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value)
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let res = null

            if (update) {
                res = await axios.put('', {
                    type: 'group',
                    modelId: data.item?.id,
                    data: {
                        ...data.item,
                        name: title,
                        title: title
                    },
                    _method: 'updateItem'
                });
                data.callback(res.data.data);
            } else {
                await axios.post('', {
                    data: {
                        title: title,
                        parentId: parentId,
                        type: 'group'
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