import {type FC, lazy, memo, ReactNode, useCallback, useMemo} from "react";
import {RowObject} from "handsontable/common";
import type {Content, JSONContent} from "vanilla-jsoneditor";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Slider} from "@/components/ui/slider.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import DynamicControls from "@/components/dynamic-controls.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Field} from "@/types";
import AdminCKEditor from "@/components/ckeditor/ckeditor.tsx";

import MultiSelect from "@/components/multi-select.tsx";
import {Pages} from "@/components/media-manager/Pages.tsx";
import {Layout} from '@/components/media-manager/Page';

const TuiLazy = lazy(() => import('@/components/toast-editor.tsx'));
const HandsonTableLazy = lazy(() => import('@/components/handsontable.tsx'));
const JsonEditorLazy = lazy(() => import('@/components/VanillaJSONEditor.tsx'));
const GeoJsonEditorLazy = lazy(() => import("@/components/geo-json.tsx"));
const MonacoLazy = lazy(() => import('@/components/monaco-editor.tsx'));


type FieldValue = string | boolean | number | Date | any[] | Content;


const FieldRenderer: FC<{
    field: Field;
    value: FieldValue;
    onChange: (name: string, value: FieldValue) => void;
    processing: boolean;
    view?: boolean;
    notFound?: string
    search?: string
}> = memo(({field, value, onChange, processing, view = false, notFound, search}) => {

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

    const inputClassName = useMemo(() => {
        if (field.type === 'color') {
            return 'max-w-[40px] p-px h-[40px] border-transparent';
        }
        if (['date', 'datetime-local', 'time', 'month', 'week'].includes(field.type)) {
            return 'w-fit';
        }
        return ''
    }, []);

    if (view && field.options?.viewPath) {
        return (
            <DynamicControls moduleComponent={field.options.viewPath as string} options={field.options?.config}
                             initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                             onChange={() => {}} disabled={true}/>
        )
    }

    switch (field.type) {
        case 'checkbox':
            return (
                <Checkbox
                    id={`${field.type}-${field.name}`}
                    disabled={processing || view || field.disabled}
                    tabIndex={1}
                    required={field.required}
                    className="cursor-pointer size-5"
                    checked={value as boolean ?? false}
                    onCheckedChange={handleCheckboxChange}
                />
            );
        case 'textarea':
            return (
                <Textarea
                    id={`${field.type}-${field.name}`}
                    tabIndex={1}
                    disabled={processing || view || field.disabled}
                    value={value as string ?? ''}
                    required={field.required}
                    onChange={handleInputChange}
                    placeholder={field.label}
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
                        disabled={processing || view || field.disabled}
                    />
                </>
            );
        case 'select':
            return (
                <Select
                    onValueChange={handleSelectChange}
                    defaultValue={value as string ?? ''}
                    disabled={processing || view || field.disabled}
                    required={field.required}
                >
                    <SelectTrigger className="w-full cursor-pointer min-h-10" id={field.name}>
                        <SelectValue placeholder=""/>
                    </SelectTrigger>
                    <SelectContent>
                        {(field.isIn ?? []).map((option) => (
                            <SelectItem value={option} key={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        case 'association':
        case 'association-many':
        case 'select-many':
            return (
                <MultiSelect
                    options={field.options}
                    onValueChange={handleAssociationChange}
                    defaultValue={value as string[] ?? []}
                    variant="secondary"
                    notFound={notFound}
                    search={search}
                    disabled={processing || view || field.disabled}
                    mode={field.type === 'association' ? 'single' : 'multiple'}
                    maxCount={10}
                    className={`${processing ? 'pointer-events-none' : ''}`}
                />
            )
        case 'wysiwyg':
            if (field.options?.name === 'ckeditor') {
                return (
                    <AdminCKEditor
                        initialValue={value as string ?? ''}
                        onChange={handleEditorChange}
                        options={field.options?.config as { items: string[] }}
                        disabled={processing || view || field.disabled}
                    />
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                     onChange={handleEditorChange} disabled={processing || view || field.disabled}/>
                )
            }
        case 'markdown':
            if (field.options?.name === 'toast-ui') {
                return (
                    <TuiLazy initialValue={field.value as string ?? ''} options={field.options?.config}
                             onChange={handleEditorChange} disabled={processing || view || field.disabled}/>
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                     onChange={handleEditorChange} disabled={processing || view || field.disabled}/>
                )
            }
        case 'table':
            if (field.options?.name === 'handsontable') {
                return (
                    <HandsonTableLazy data={value as any[]} config={field.options?.config}
                                      onChange={handleTableChange} disabled={processing || view || field.disabled}/>
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                     onChange={handleEditorChange} disabled={processing || view || field.disabled}/>
                )
            }
        case 'jsonEditor':
            if (field.options?.name === 'jsoneditor') {
                return (
                    <JsonEditorLazy content={value as Content} name={`${field.type}-${field.name}`}
                                    onChange={handleJSONChange} {...field.options?.config} disabled={processing || view || field.disabled}
                    />
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                     onChange={handleJSONChange} disabled={processing || view || field.disabled}/>
                )
            }
        case 'codeEditor':
            if (field.options?.name === 'monaco') {
                return (
                    <MonacoLazy value={value as string ?? ''} onChange={handleCodeChange}
                                options={field.options?.config} disabled={processing || view || field.disabled}/>
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                     onChange={handleJSONChange} disabled={processing || view || field.disabled}/>
                )
            }
        case 'geoJson':
            if (field.options?.name === 'leaflet') {
                return (
                    <GeoJsonEditorLazy
                        mode="all"
                        initialFeatures={value as [] ?? undefined}
                        onFeaturesChange={handleGeoJsonChange}
                        disabled={processing || view || field.disabled}
                    />
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''} name={`${field.type}-${field.name}`}
                                     onChange={handleJSONChange} disabled={processing || view || field.disabled}/>
                )
            }
        case 'mediamanager':
            return (
                <Pages layout={Layout.Grid} />
            )
        default:
            return (
                <Input
                    id={field.name}
                    type={field.type}
                    className={`${inputClassName} min-h-10`}
                    required={field.required}
                    tabIndex={1}
                    value={value as any ?? ''}
                    onChange={handleInputChange}
                    disabled={processing || view || field.disabled}
                    placeholder={field.label}
                />
            );
    }
});

export default FieldRenderer
