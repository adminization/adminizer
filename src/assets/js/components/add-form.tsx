import { type FC, useCallback, FormEventHandler, memo, useEffect, useState, useRef } from 'react';
import { Link, useForm } from "@inertiajs/react";
import { Info, LoaderCircle, MoveLeft } from "lucide-react";
import { Field } from '@/types';
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/icon.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { type Content } from "vanilla-jsoneditor";
import FieldRenderer from "@/components/field-renderer.tsx";
import { useInView } from 'react-intersection-observer';
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getFieldError, hasFormErrors, resetFormErrors } from '@/hooks/form-state';
import InputError from "@/components/input-error.tsx";
import { AddProps } from '@/pages/add';
import axios from "axios";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { DialogStackHandle } from '@/components/ui/dialog-stack';
import HistoryDialogStack from '@/components/history/HistoryDialogStack';


export type FieldValue = string | boolean | number | Date | any[] | Content;


const LabelRenderer: FC<{ field: Field }> = memo(({ field }) => {
    if (!field || typeof field !== 'object' || !field.label) {
        console.error('Invalid field for LabelRenderer:', field);
        return null;
    }
    return (
        <div className="flex gap-3">
            <Label htmlFor={`${field.type}-${field.name}`}>{field.label}</Label>
            {field.tooltip && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger onClick={(e) => e.preventDefault()}>
                            <Icon
                                iconNode={Info}
                                className="text-primary w-5 h-5 cursor-pointer"
                            />
                        </TooltipTrigger>
                        <TooltipContent align="center" side="top" className="z-1002">
                            <p>{field.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    )
})

const LazyField: FC<{
    field: Field;
    value: FieldValue;
    onChange: (name: string, value: FieldValue) => void;
    processing: boolean;
    notFound?: string
    search?: string
}> = memo(({ field, value, onChange, processing, notFound, search }) => {
    if (!field || typeof field !== 'object' || !field.name || !field.type) {
        console.error('Invalid field for LazyField:', field);
        return <div className="text-red-500">Error: Invalid field data</div>;
    }
    const [ref, inView] = useInView({
        triggerOnce: true,
        rootMargin: '100px 0px',
    });

    return (
        <div ref={ref} className="grid gap-4 w-full">
            {inView ? (
                <FieldRenderer
                    field={field}
                    value={value}
                    onChange={onChange}
                    notFound={notFound}
                    search={search}
                    processing={processing}
                />
            ) : <Skeleton className="w-full h-[250px] rounded-sm" />}
        </div>
    );
});


const AddForm: FC<{
    page: { props: AddProps },
    catalog: boolean,
    callback?: (record: any, targetBlank?: boolean, visible?: boolean) => void,
    openNewWindow?: boolean,
    DnavVisible?: boolean,
    openNewWindowLabel?: string,
    visibleLable?: string,
    isNavigation?: boolean
}> =
    ({ page, catalog, callback, openNewWindow, openNewWindowLabel, isNavigation, DnavVisible, visibleLable }) => {

        const { btnBack, btnHistory, view, edit, history, notFound, model, fields } = page.props;

        const {
            data,
            setData,
            post,
            processing,
            transform
        } = useForm<Record<string, any>>({
            ...Object.fromEntries((fields || []).map(field => [field.name, field.value ?? undefined])),
            jsonPopupCatalog: catalog
        });
        const [catalogProcessing, setCatalogProcessing] = useState(false)
        const [navTargetBlank, setNavTargetBlank] = useState(openNewWindow ?? false)
        const [navVisible, setNavVisible] = useState(DnavVisible ?? false)
        const dialogRef = useRef<DialogStackHandle>(null);

        useEffect(() => {
            localStorage.removeItem('currentHistoryView')
        }, [])

        // useEffect(() => {
        //     console.log(data);
            
        // }, [data])

        // Forcibly updating data when changing passes
        useEffect(() => {
            setNavTargetBlank(openNewWindow ?? false);
            resetFormErrors();
            
            // Populate form state; use a safe fallback when fields is not an array
            setData({
                ...Object.fromEntries(
                    (fields || []).map(field => [
                        field.name,
                        (field.type === 'mediamanager' || field.type === 'single-file') && (field.value === null || field.value === undefined)
                            ? []
                            : field.value
                    ])
                ),
                jsonPopupCatalog: catalog
            });           

            return () => resetFormErrors();
        }, [fields, catalog, openNewWindow, setData]);

        // Callbacks/hooks that must run on every render (to keep hook order stable)
        const handleFieldChange = useCallback((fieldName: string, value: FieldValue) => {
            // @ts-ignore
            setData(fieldName, value);
        }, [setData]);

        // Validation and informative early returns (hooks have already been initialized above)
        if (!Array.isArray(fields)) {
            console.error('Fields is not an array:', fields);
            return <div className="p-4 text-red-500">Error: Fields data is invalid</div>;
        }

        if (fields.length === 0) {
            console.warn('Fields array is empty');
            return <div className="p-4 text-gray-500">No fields to display</div>;
        }

        // Check each field for required properties
        const invalidFields = fields.filter(field => !field || typeof field !== 'object' || !field.name || !field.type || !field.label);
        if (invalidFields.length > 0) {
            console.error('Invalid fields found:', invalidFields);
            return <div className="p-4 text-red-500">Error: Some fields are missing required properties (name, type, label)</div>;
        }

        const submit: FormEventHandler = async (e) => {
            e.preventDefault();
            // console.log(data)
            // return
            if (catalog) {
                setCatalogProcessing(true)
                const res = await axios.post(page.props.postLink, data)
                if (res.status === 200) {
                    if (callback) {
                        isNavigation ? callback(res.data.record, navTargetBlank, navVisible) : callback(res.data.record)
                    }
                }
            } else {
                const backUrl = localStorage.getItem('backUrl')
                transform((data) => ({
                    ...data,
                    redirectUrl: backUrl ?? ''
                }))
                post(page.props.postLink, {
                    onSuccess: () => {
                        localStorage.setItem('backUrl', '')
                    }
                });
            }
        };

        return (
            <>
                {!catalog &&
                    <div className="w-full sticky z-[1001] top-0 bg-background shadow-md">
                        <div className="p-4 flex gap-4">
                            <Button className="w-fit" asChild>
                                <Link href={btnBack.link} preserveScroll={true}>
                                    <Icon iconNode={MoveLeft} />
                                    {btnBack.title}
                                </Link>
                            </Button>
                            <Button variant="green" type="submit" className="w-fit lg:hidden"
                                form="addUserForm"
                                disabled={catalogProcessing || processing || page.props.view || hasFormErrors()}>
                                {catalogProcessing || processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {page.props.btnSave.title}
                            </Button>
                        </div>
                    </div>
                }
                <div className="p-4 w-full mt-6">
                    <form
                    id="addUserForm"
                    onSubmit={submit}
                    className={view ? 'cursor-not-allowed' : ''}
                >
                    <div
                        className={`grid gap-4 max-w-286 pb-8 lg:grid-cols-[1fr_220px]`}>
                        <div className="flex flex-col gap-10">
                            {fields.map((field) => (
                                <div className={`grid gap-4 w-full ${view ? 'pointer-events-none' : ''}`}
                                    key={field.name}>
                                    {field.type === "markdown" || field.type === "table" || field.type === "jsonEditor" || field.type === "codeEditor" || field.type === "geoJson" ?
                                        <>
                                            <LabelRenderer field={field} />
                                            <InputError message={getFieldError(`${field.type}-${field.name}`)} />
                                            <LazyField
                                                field={field}
                                                value={data[field.name]}
                                                onChange={handleFieldChange}
                                                processing={catalogProcessing || processing || view}
                                                notFound={notFound}
                                                search={page.props.search}
                                            />
                                        </>
                                        :
                                        <>
                                            <LabelRenderer field={field} />
                                            <InputError message={getFieldError(`${field.type}-${field.name}`)} />
                                            <FieldRenderer
                                                field={field}
                                                value={data[field.name]}
                                                onChange={handleFieldChange}
                                                processing={catalogProcessing || processing || view}
                                                notFound={notFound}
                                                search={page.props.search}
                                            />
                                        </>
                                    }
                                </div>
                            ))}
                        </div>
                        <div
                            className={`p-4 rounded-md h-fit sticky shadow ${catalog ? 'top-0 grid gap-4' : 'top-[84px] hidden lg:block'}`}>
                            {isNavigation &&
                                <>
                                    <div className="flex gap-4 items-center">
                                        <Checkbox
                                            id="targetBlank"
                                            checked={navTargetBlank}
                                            onCheckedChange={(checked) => setNavTargetBlank(!!checked)}
                                            className="cursor-pointer size-5"
                                        />
                                        <Label htmlFor="targetBlank">{openNewWindowLabel}</Label>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <Checkbox
                                            id="visible"
                                            checked={navVisible}
                                            onCheckedChange={(checked) => setNavVisible(!!checked)}
                                            className="cursor-pointer size-5"
                                        />
                                        <Label htmlFor="visible">{visibleLable}</Label>
                                    </div>
                                </>
                            }
                            <div className={`flex gap-2 ${(history && (edit || view)) ? 'justify-center' : 'justify-start'}`}>
                                <Button variant="green" type="submit" className="w-fit"
                                    disabled={catalogProcessing || processing || page.props.view || hasFormErrors()}>
                                    {(catalogProcessing || processing) && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    {page.props.btnSave.title}
                                </Button>
                                {(history && (edit || view)) && <Button variant="outline" className="w-fit"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        dialogRef.current?.open()
                                    }}
                                >{btnHistory.title}</Button>}
                            </div>
                        </div>
                    </div>
                </form>
                {(history && (edit || view)) && <HistoryDialogStack
                    dialogRef={dialogRef}
                    modelName={model}
                    modelId={fields.find(e => e.name === 'id')?.value}
                    callback={(data) => {
                        for (const key of Object.keys(data)) {
                            setData(key, data[key]);
                        }
                        dialogRef.current?.close()
                    }}
                />}
            </div>
            </>
        );
    };

export {
    LazyField,
    LabelRenderer,
}

export default AddForm;
