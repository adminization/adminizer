import {useContext, useState} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Media} from "@/types";
import {cn} from "@/lib/utils.ts";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu.tsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import { adminApi } from '@/lib/admin-api';

const imagesTypes = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

interface ImageProps {
    media: Media,
    className?: string
    messages: Record<string, string>
    openMeta: (media: Media) => void
    crop: (media: Media) => void
    openVariant: (media: Media) => void
    destroy: (media: Media) => void
}

const Image = ({media, className, messages, openMeta, crop, openVariant, destroy}: ImageProps) => {
    const {imageUrl, uploadUrl, addMedia, removeMedia, checkMedia} = useContext(MediaManagerContext);
    const [delOPen, setDelOpen] = useState(false);
    const isSelected = checkMedia(media);

    const openFile = () => {
        const url = window.bindPublic ? `/public${media.url}` : media.url;
        window.open(url, "_blank")?.focus();
    }

    const destroyItem = async () => {
        const res = await adminApi.delete<any>(uploadUrl, {item: media});
        if (res.data.type === "success"){
            destroy(media);
        } else {
            alert(res.data.msg);
        }
    }

    const toggleMedia = () => {
        if (isSelected) {
            removeMedia(media);
        } else {
            addMedia(media);
        }
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div className="relative cursor-pointer w-fit">
                        {isSelected && <div
                            className="absolute top-0 left-0 z-10 w-[20px] h-[20px] bg-white flex items-center justify-center"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="1em"
                                height="1em"
                                viewBox="0 0 1200 1200"
                            >
                                <path
                                    fill="currentColor"
                                    d="m1004.237 99.152l-611.44 611.441l-198.305-198.305L0 706.779l198.305 198.306l195.762 195.763L588.56 906.355L1200 294.916z"
                                />
                            </svg>
                        </div>
                        }
                        <img className={cn('w-full h-full', className)} src={imageUrl(media)} alt=""
                             onClick={toggleMedia}/>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="z-[1005]">
                    <ContextMenuItem onClick={() => openMeta(media)}>
                        {messages["Meta data"]}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => openFile()}>
                        {messages["View"]}
                    </ContextMenuItem>
                    {imagesTypes.has(media.mimeType) &&
                        <ContextMenuItem onClick={() => crop(media)}>
                            {messages["Crop"]}
                        </ContextMenuItem>
                    }
                    <ContextMenuItem onClick={() => openVariant(media)}>
                        {messages["Variants"]}
                    </ContextMenuItem>
                    <ContextMenuItem variant="destructive" onClick={() => setDelOpen(true)}>
                        {messages["Delete"]}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            <Dialog open={delOPen} onOpenChange={(open) => {
                setDelOpen(open)
                if (!open) {
                    setTimeout(() => {
                        document.body.removeAttribute('style')
                    }, 300)
                }
            }}>
                <DialogContent className="z-[1022]">
                    <DialogHeader>
                        <DialogTitle>{messages["Delete"]}</DialogTitle>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="destructive" asChild onClick={destroyItem}>
                                <span>{messages["Yes"]}</span>
                            </Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">{messages["No"]}</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Image

