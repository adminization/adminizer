import React, {useState, useRef, FC, useContext} from 'react';
import {TriangleAlert, XIcon} from "lucide-react";
import styles from '@/components/media-manager/components/DropZone.module.css'
import { adminApi } from '@/lib/admin-api';
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Media} from "@/types";

interface DropZoneProps {
    callback: (media: Media) => void
    messages: Record<string, string>
    name: string
}

const DropZone: FC<DropZoneProps> = ({callback, messages, name}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [alert, setAlert] = useState<string>('');

    const {uploadUrl, group, accept} = useContext(MediaManagerContext);

    const handleClose = () => {
        setAlert('');
    };

    // Checking if the file type is allowed
    const isFileAllowed = (file: File): boolean => {
        const fileType = file.type;
        const fileName = file.name;

        // Check by MIME type or extension
        return accept.some(type => {
            if (type.startsWith('.')) {
                return fileName.toLowerCase().endsWith(type.toLowerCase());
            } else if (type.endsWith('/*')) {
                const mainType = type.slice(0, -1); // 'image/*' -> 'image'
                return fileType.startsWith(mainType);
            } else {
                return fileType === type;
            }
        });
    };

    const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);

        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
            if (!isFileAllowed(file)) {
                setLoading(false);
                setAlert(messages[`File type not allowed`] || `File type not allowed: ${file.name}`);
                return; // Stopping the download
            }
            await upload(file);
        }
    };

    const onLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.target.files) {
            const files = Array.from(e.target.files);
            for (const file of files) {
                if (!isFileAllowed(file)) {
                    setAlert(`${messages[`File type are not supported`]} .${file.name.split('.').pop()?.toLowerCase()}`);
                    return; // Stopping the download
                }
                setLoading(true);
                await upload(file);
            }
        }
    };

    const upload = async (file: File) => {
        try {
            const form = new FormData();
            form.append("name", file.name);
            form.append("group", group);
            form.append("file", file);

            const res = await adminApi.post<any>(`${uploadUrl}/upload`, form, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.msg === "success") {
                setLoading(false);
                callback(res.data.data[0]);
                return;
            }

            setLoading(false);
            setAlert(res.data.error || "Upload failed");

        } catch (error) {
            setLoading(false);
            const httpError = error as {
                response?: { data?: { error?: string; message?: string } | string; status?: number; statusText?: string };
                request?: unknown;
            };

            if (httpError.response) {
                const responseData = httpError.response.data;
                const errorMessage = typeof responseData === 'string'
                    ? responseData
                    : responseData?.error || responseData?.message || httpError.response.statusText;
                setAlert(errorMessage || `Error: ${httpError.response.status ?? 'unknown'}`);
            } else if (httpError.request) {
                setAlert("No response from server");
            } else {
                setAlert("Request setup error");
            }

            console.error(error);
        }
    };

    return (
        <div className="mt-2">
            {alert &&
                <div className="bg-red-600 rounded font-medium mb-4">
                    <div className="flex gap-2 p-2 text-white justify-between">
                        <div className="flex gap-2">
                            <TriangleAlert/>
                            <span className="alert-text">{alert}</span>
                        </div>
                        <div onClick={handleClose}
                             className="cursor-pointer hover:opacity-80 transition-opacity">
                            <XIcon/>
                        </div>
                    </div>
                </div>
            }
            <div className="relative">
                <div
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`flex items-center justify-center w-full ${loading ? 'opacity-30' : ''}`}
                >
                    <label
                        htmlFor={`dropzone-file-${name}`}
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true"
                                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">{messages["Click to upload or drag and drop"]}</span>
                            </p>
                        </div>
                        <input
                            id={`dropzone-file-${name}`}
                            key={`dropzone-file-${name}`}
                            type="file"
                            ref={fileInputRef}
                            onChange={onLoad}
                            className="hidden"
                            multiple
                            accept={accept.join(',')}
                        />
                    </label>
                </div>
                {loading && (
                    <span
                        className={`${styles.Loader} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-3 border-solid border-gray-200 border-t-blue-500 rounded-full animate-spin`}
                    ></span>
                )}
            </div>
        </div>
    )
}
export default DropZone

