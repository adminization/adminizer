import {type FC, lazy, memo, ReactNode, useCallback, useMemo} from "react";
import {RowObject} from "handsontable/common";
import type {Content, JSONContent} from "vanilla-jsoneditor";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Slider} from "@/components/ui/slider.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import DynamicControls from "@/components/dynamic-controls.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Field, Media} from "@/types";

import MultiSelect from "@/components/multi-select.tsx";
import {Layout} from '@/components/media-manager/Item.tsx';
import {useRelationStack} from "@/components/relation/RelationDialogStack";

const MediaLazy = lazy(() => import('@/components/media-manager/media-manager.tsx'));

type FieldValue = string | boolean | number | Date | any[] | Content;


const FieldRenderer: FC<{
    field: Field;
    value: FieldValue;
    onChange: (name: string, value: FieldValue) => void;
    processing: boolean;
    notFound?: string
    search?: string
}> = memo(({field, value, onChange, processing, notFound, search}) => {

    const relationStack = useRelationStack();

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            onChange(field.name, e.target.value);
        },
        [onChange, field.name]
    );

    const handleSliderChange = useCallback(
        (values: number[]) => {
            onChange(field.name, values[0]);
        },
        [onChange, field.name]
    );

    const handleCheckboxChange = useCallback(
        (checked: boolean) => {
            onChange(field.name, checked);
        },
        [onChange, field.name]
    );

    const handleSelectChange = useCallback(
        (selectedValue: string) => {
            onChange(field.name, selectedValue);
        },
        [onChange, field.name]
    );

    const handleEditorChange = useCallback(
        (value: string) => {
            onChange(field.name, value);
        },
        [onChange, field.name]
    )

    const handleTableChange = useCallback((value: RowObject[]) => {
        onChange(field.name, value);
    }, [onChange, field.name])

    const handleJSONChange = useCallback((value: JSONContent) => {
        onChange(field.name, value.json as any);
    }, [onChange, field.name])

    const handleCodeChange = useCallback((value: string) => {
            onChange(field.name, value)
        }, [onChange, field.name]
    )

    const handleGeoJsonChange = useCallback((value: any) => {
        onChange(field.name, value)
    }, [onChange, field.name])

    const handleAssociationChange = useCallback((value: string[]) => {
        onChange(field.name, value)
    }, [onChange, field.name])

    const handleMediaChange = useCallback((mediaList: Media[]) => {
        const transformedData = mediaList.map(media => (
            {
                id: media.id, url: media.url, mimeType: media.mimeType, filename: media.filename
            }))
        onChange(field.name, transformedData)
    }, [onChange, field.name])

    const inputClassName = useMemo(() => {
        if (field.type === 'color') {
            return 'max-w-[40px] p-px h-[40px] border-transparent';
        }
        if (['date', 'datetime-local', 'time', 'month', 'week'].includes(field.type)) {
            return 'w-fit';
        }
        return ''
    }, []);

    switch (field.type) {
        case 'checkbox':
            return (
                <Checkbox
                    id={`${field.type}-${field.name}`}
                    disabled={processing || field.disabled}
                    tabIndex={1}
                    required={field.required}
                    className="cursor-pointer size-5 scroll-pt-30 scroll-mt-30"
                    checked={value as boolean ?? false}
                    onCheckedChange={handleCheckboxChange}
                />
            );
        case 'textarea':
            return (
                <Textarea
                    id={`${field.type}-${field.name}`}
                    tabIndex={1}
                    disabled={processing || field.disabled}
                    value={value as string ?? ''}
                    required={field.required}
                    onChange={handleInputChange}
                    placeholder={field.label}
                    className="scroll-pt-30 scroll-mt-30"
                />
            );
        case 'range':
            return (
                <>
                    <output>{value as ReactNode}</output>
                    <Slider
                        defaultValue={[Number(field.value) || 0]}
                        value={[Number(value) || 0]}
                        max={field.options?.max ? Number(field.options.max) : 100}
                        min={field.options?.min ? Number(field.options.min) : 0}
                        step={1}
                        id={`${field.type}-${field.name}`}
                        onValueChange={handleSliderChange}
                        disabled={processing || field.disabled}
                    />
                </>
            );
        case 'select':
            return (
                <Select
                    onValueChange={handleSelectChange}
                    value={value as string ?? ''}
                    disabled={processing || field.disabled}
                    required={field.required}
                >
                    <SelectTrigger className="w-full cursor-pointer min-h-10 scroll-pt-30 scroll-mt-30" id={field.name}>
                        <SelectValue placeholder=""/>
                    </SelectTrigger>
                    <SelectContent className="z-[9999999]">
                        {(Array.isArray(field.isIn)
                                ? field.isIn.map(value => [value, value]) // if an array, use the value and the displayed value to be the same
                                : Object.entries(field.isIn as object) // if an object, we get pairs [key, display value]
                        ).map(([key, value]) => (
                            <SelectItem value={String(key)} key={String(key)}>
                                {String(value)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        case 'association':
        case 'association-many':
        case 'select-many': {
            const isAssociation = field.type === 'association' || field.type === 'association-many';
            const canOpen = isAssociation && !!field.relatedModel && !!relationStack;
            const handleOpenItem = canOpen
                ? (id: string) => relationStack!.open(field.relatedModel!, id)
                : undefined;
            const handleAddNew = canOpen && field.canCreateRelated
                ? () => relationStack!.openCreate(field.relatedModel!)
                : undefined;
            return (
                <MultiSelect
                    options={field.options}
                    onValueChange={handleAssociationChange}
                    defaultValue={value as string[] ?? []}
                    variant="secondary"
                    notFound={notFound}
                    search={search}
                    disabled={processing || field.disabled}
                    mode={field.type === 'association' ? 'single' : 'multiple'}
                    maxCount={10}
                    onOpenItem={handleOpenItem}
                    onAddNew={handleAddNew}
                    className={`${processing ? 'pointer-events-none' : ''} scroll-pt-30 scroll-mt-30`}
                />
            )
        }
        case 'wysiwyg':
        case 'markdown':
            return (
                <DynamicControls moduleComponent={field.options?.path as string}
                                 cssPath={field.options?.cssPath as string | undefined}
                                 options={field.options?.config}
                                 initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                 onChange={handleEditorChange} disabled={processing || field.disabled}/>
            )
        case 'table':
            return (
                <DynamicControls moduleComponent={field.options?.path as string}
                                 cssPath={field.options?.cssPath as string | undefined}
                                 options={field.options?.config}
                                 initialValue={value as any[] ?? []} name={`${field.type}-${field.name}`}
                                 onChange={handleTableChange} disabled={processing || field.disabled}/>
            )
        case 'jsonEditor':
            return (
                <DynamicControls moduleComponent={field.options?.path as string}
                                 cssPath={field.options?.cssPath as string | undefined}
                                 options={field.options?.config}
                                 initialValue={value as Content} name={`${field.type}-${field.name}`}
                                 onChange={handleJSONChange} disabled={processing || field.disabled}/>
            )
        case 'codeEditor':
            return (
                <DynamicControls moduleComponent={field.options?.path as string}
                                 cssPath={field.options?.cssPath as string | undefined}
                                 options={field.options?.config}
                                 initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                 onChange={handleCodeChange} disabled={processing || field.disabled}/>
            )
        case 'geoJson':
            return (
                <DynamicControls moduleComponent={field.options?.path as string}
                                 cssPath={field.options?.cssPath as string | undefined}
                                 options={field.options?.config}
                                 initialValue={value as [] ?? []} name={`${field.type}-${field.name}`}
                                 onChange={handleGeoJsonChange} disabled={processing || field.disabled}/>
            )
        case 'mediamanager':
        case 'single-file':
                        return (
                <MediaLazy layout={Layout.Grid} value={value as Media[]} onChange={handleMediaChange}
                           config={{...field.options}} type={field.type} name={field.name}/>
            )
        default:
            return (
                <Input
                    id={field.name}
                    type={field.type}
                    className={`${inputClassName} min-h-10 scroll-pt-30 scroll-mt-30`}
                    required={field.required}
                    tabIndex={1}
                    value={value as any ?? ''}
                    onChange={handleInputChange}
                    disabled={processing || field.disabled}
                    placeholder={field.label}
                />
            );
    }
});

export default FieldRenderer
