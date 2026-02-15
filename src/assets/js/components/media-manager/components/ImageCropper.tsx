import {useEffect, useRef, useState} from "react";
import Cropper from "react-cropper";
import type {ReactCropperElement, ReactCropperProps} from 'react-cropper';
import {Button} from "@/components/ui/button.tsx";
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LoaderCircle} from "lucide-react";
import {Label} from "@/components/ui/label.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Input} from "@/components/ui/input.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.tsx";
import axios from "axios";
import {Media} from "@/types";

interface ImageCropperProps {
    item: Media;
    callback: (media: Media, newVariant: Media) => void;
    uploadUrl: string;
    group: string;
    messages: Record<string, string>
}

const ImageCropper = ({
                          item,
                          callback,
                          uploadUrl,
                          group,
                          messages
                      }: ImageCropperProps) => {
    const cropperRef = useRef<ReactCropperElement & {cropper : {ready: boolean}}>(null);
    const [convertWebp, setConvertWebp] = useState(false);
    const [convertJpeg, setConvertJpeg] = useState(false);
    const [coordinates, setCoordinates] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Similar Cropper.js settings
    const cropperOptions: ReactCropperProps = {
        viewMode: 2,
        responsive: true,
        restore: true,
        checkCrossOrigin: true,
        checkOrientation: true,
        modal: true,
        guides: true,
        center: true,
        highlight: true,
        background: true,
        autoCrop: true,
        movable: true,
        rotatable: true,
        scalable: true,
        zoomable: true,
        zoomOnTouch: true,
        zoomOnWheel: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: true,
    };

    useEffect(() => {
        if(cropperRef.current) setIsReady(cropperRef.current?.cropper.ready)
    }, [cropperRef.current?.cropper]);

    const onCrop = () => {
        if (cropperRef.current?.cropper) {
            const data = cropperRef.current.cropper.getData();
            setCoordinates({
                x: Math.round(data.x),
                y: Math.round(data.y),
                width: Math.round(data.width),
                height: Math.round(data.height),
            });
        }
    };

    const setManualCoordinates = () => {
        if (cropperRef.current) {
            cropperRef.current.cropper.setData(coordinates);
        }
    };

    const preview = () => {
        const canvas = cropperRef.current?.cropper.getCroppedCanvas();
        setPreviewSrc(canvas?.toDataURL(item.mimeType, 1) ?? "");
    };

    const save = async () => {
        if (!cropperRef.current) return;
        setIsLoading(true);
        const mimeType = convertWebp
            ? "image/webp"
            : convertJpeg
                ? "image/jpeg"
                : item.mimeType;

        cropperRef.current.cropper.getCroppedCanvas().toBlob(
            async (blob) => {
                if (!blob) return;

                const parts = mimeType.split("/");
                const config = {
                    width: coordinates.width,
                    height: coordinates.height,
                };
                const name = `${item.filename}_${config.width}x${config.height}.${parts[1]}`;

                const form = new FormData();
                form.append("name", name);
                form.append("group", group);
                form.append("isCropped", "true");
                form.append("item", JSON.stringify(item));
                form.append("file", blob);

                try {
                    const res = await axios.post(`${uploadUrl}/upload-variant?isCropped="true"`, form, {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    });
                    if (res.data.msg === "success") {
                        setIsLoading(false);
                        callback(item, res.data.data);
                    }
                } catch (error) {
                    console.error("Upload error:", error);
                }
            },
            mimeType,
            0.9
        );
    };

    // Navigation/Zoom Button Control
    const move = (dx: number, dy: number) => {
        if (!cropperRef.current?.cropper) return;

        // Getting the current coordinates
        const currentData = cropperRef.current.cropper.getData();

        // Calculate new coordinates
        const newX = currentData.x + dx;
        const newY = currentData.y + dy;

        // Applying the changes
        cropperRef.current.cropper.setData({
            ...currentData,
            x: newX,
            y: newY
        });
    };

    const flip = (axis: "x" | "y") => {
        if (!cropperRef.current?.cropper) return;
        const currentScaleX = cropperRef.current.cropper.getData().scaleX || 1;
        const currentScaleY = cropperRef.current.cropper.getData().scaleY || 1;

        if (axis === "x") {
            cropperRef.current.cropper.scaleX(currentScaleX * -1);
        } else {
            cropperRef.current.cropper.scaleY(currentScaleY * -1);
        }
    };

    return (
        <div className="relative">
            {!isReady && <LoaderCircle className="animate-spin absolute top-1/3 left-1/2 -translate-x-1/2"/> }
            <Cropper
                src={window.bindPublic ? `/public${item.url}` : item.url}
                style={{height: 540, width: "100%"}}
                className={`${isReady ? '' : 'invisible'}`}
                initialAspectRatio={1}
                ref={cropperRef}
                {...cropperOptions}
                crop={onCrop}
            />

            {/* Coordinates */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                {Object.entries(coordinates).map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center gap-2">
                        <Label className="capitalize">{key}</Label>
                        <Input
                            type="number"
                            value={value}
                            onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                setCoordinates((prev) => ({
                                    ...prev,
                                    [key]: newValue,
                                }));
                            }}
                            onBlur={setManualCoordinates}
                        />
                    </div>
                ))}
            </div>

            {/* Control buttons */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                <Button variant="outline" onClick={() => move(0, -20)}>
                    <ArrowUp/>
                </Button>
                <Button variant="outline" onClick={() => move(0, 20)}>
                    <ArrowDown/>
                </Button>
                <Button variant="outline" onClick={() => move(-20, 0)}>
                    <ArrowLeft/>
                </Button>
                <Button variant="outline" onClick={() => move(20, 0)}>
                    <ArrowRight/>
                </Button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
                <Button variant="outline" onClick={() => flip("x")}>
                    {messages["Flip X"]}
                </Button>
                <Button variant="outline" onClick={() => flip("y")}>
                    {messages["Flip Y"]}
                </Button>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" onClick={preview}>{messages["Preview"]}</Button>
                    </DialogTrigger>
                    <DialogContent className="z-[1011]">
                        <DialogHeader>
                            <DialogTitle>Preview</DialogTitle>
                        </DialogHeader>
                        <img src={previewSrc ?? ''} alt="Preview" autoFocus={true}/>
                    </DialogContent>
                </Dialog>
                <div className="flex gap-2 items-center w-full">
                    <Button variant="default" onClick={save} disabled={isLoading} className="flex-3/4">{messages["Save"]}</Button>
                    {isLoading && <LoaderCircle className="size-5 animate-spin"/>}
                </div>
            </div>

            {/* Formats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="flex gap-2 items-center">
                    <Checkbox
                        id="webp-conv"
                        checked={convertWebp}
                        onCheckedChange={(value) => {
                            setConvertWebp(!convertWebp);
                            if (value) setConvertJpeg(false);
                        }}
                    />
                    <Label className="cursor-pointer" htmlFor="webp-conv">{messages["Convert WebP"]}</Label>
                </div>
                <div className="flex gap-2 items-center">
                    <Checkbox
                        id="jpeg-conv"
                        checked={convertJpeg}
                        onCheckedChange={(value) => {
                            setConvertJpeg(!convertJpeg);
                            if (value) setConvertWebp(false);
                        }}
                    />
                    <Label className="cursor-pointer" htmlFor="jpeg-conv">{messages["Convert Jpeg"]}</Label>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;