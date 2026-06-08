import {useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";
import {adminApi} from "@/lib/admin-api";

interface ModelLinkAddProps {
    labels: Record<string, string>;
    model: string;
    type: string;
    parentId?: string | number;
    items: {
        id: number | string;
        name: string;
    }[];
    add: (model: string) => void;
    callback: () => void;
}

const ModelLinkAdd = ({type, callback, parentId, ...data}: ModelLinkAddProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSelect = async (value: string) => {
        try {
            setIsSubmitting(true);
            const res = await adminApi.post("", {
                data: {
                    record: value,
                    parentId,
                    _method: "select",
                    type,
                },
                _method: "createItem",
            });
            if (res.data) {
                callback();
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
                            {data.items.map((item) => (
                                <SelectItem value={item.id.toString()} key={`${item.id}-${item.name}`}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="mt-8">
                <span><b>{data.labels.OR}</b></span>
            </div>
            <Button className="mt-8" onClick={() => data.add(data.model)}>
                <Plus/>
                {data.labels.createTitle}
            </Button>
        </div>
    );
};

export default ModelLinkAdd;
