import React, {useContext, useEffect, useState} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import { adminApi } from '@/lib/admin-api';
import {Media, MediaMeta} from "@/types";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle} from "lucide-react";

interface MediaMetaProps {
    media: Media
    callback: () => void
}

const MediaMetaForm = ({media, callback}: MediaMetaProps) => {
    const {uploadUrl} = useContext(MediaManagerContext);
    const [metaItems, setMetaItems] = useState<MediaMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setMetaItems([]);
        const getMeta = async () => {
            try {
                const res = await adminApi.post<any>(uploadUrl, {
                    item: media,
                    _method: 'getMeta'
                })
                setMetaItems(res.data.data)
            } catch (error) {
                console.error('Error fetching meta:', error);
            }
            finally {
                setIsLoading(false);
            }
        };

        if (media) getMeta();
    }, [media]);

    const capitalize = (title: string) => {
        return title.charAt(0).toUpperCase() + title.slice(1);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        setIsLoading(true);
        e.preventDefault();
        e.stopPropagation();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        try {
            let res = await adminApi.post(uploadUrl, {
                item: media,
                data,
                _method: 'addMeta'
            });
            if (res.data.massage === 'ok') {
                setIsLoading(false);
                callback();
            }
        } catch (error) {
            console.error('Error saving meta:', error);
        }
    };

    return (
        <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit} id="form-meta">
            {metaItems.length > 0 &&
                metaItems.map((item) => (
                    <div key={item.key} className="flex flex-col gap-4">
                        <Label htmlFor={item.key}>{capitalize(item.key)}</Label>
                        <Input
                            id={item.key}
                            name={item.key}
                            defaultValue={item.value as string}
                            disabled={isLoading}
                        />
                    </div>
                ))}
            <div className="flex gap-2 items-center mt-8">
                <Button className="w-fit" type="submit" form="form-meta" disabled={isLoading}>
                    Save
                </Button>
                {isLoading && <LoaderCircle className="size-5 animate-spin"/>}
            </div>
        </form>
    )
}

export default MediaMetaForm

