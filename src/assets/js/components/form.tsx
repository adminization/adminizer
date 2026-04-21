import {useForm, usePage} from "@inertiajs/react";
import {Field, SharedData} from "@/types";
import {FormEventHandler, useCallback, useEffect} from "react";
import {getFieldError, hasFormErrors, resetFormErrors} from "@/hooks/form-state.ts";
import {FieldValue, LabelRenderer, LazyField} from "@/components/add-form.tsx";
import InputError from "@/components/input-error.tsx";
import FieldRenderer from "@/components/field-renderer.tsx";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle} from "lucide-react";

interface FormProps extends SharedData {
    fields: Field[];
    btnSave: {
        title: string;
    },
    postLink: string,
}

const Form = () => {
    const page = usePage<FormProps>();
    const {fields} = page.props;
    const uiMessages = (page.props.uiMessages || {}) as Record<string, string>;

    // initialize useForm with a safe fallback to avoid crashing when `fields` is missing
    const {
        data,
        setData,
        // errors,
        post,
        processing,
    } = useForm<Record<string, any>>({
        ...Object.fromEntries((fields || []).map(field => [field.name, field.value ?? undefined]))
    });

    useEffect(() => {
        // Reset errors
        resetFormErrors();
        return () => {
            resetFormErrors();
        };
    }, []);

    const handleFieldChange = useCallback(
        (fieldName: string, value: FieldValue) => {
            // @ts-ignore
            setData(fieldName, value);
        }, [setData]);

    // Basic validation: ensure fields is an array and has entries
    if (!Array.isArray(fields)) {
        console.error('Fields is not an array in Form component:', fields);
        return <div className="p-4 text-red-500">{uiMessages["Error: Fields data is invalid"] || 'Error: Fields data is invalid'}</div>;
    }

    if (fields.length === 0) {
        console.warn('Fields array is empty in Form component');
        return <div className="p-4 text-gray-500">{uiMessages["No fields to display"] || 'No fields to display'}</div>;
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(page.props.postLink, {
            preserveState: false
        });
    };

    return (
        <div className="p-4 w-full">
            <div className="w-full sticky z-[1001] py-4 pb-8 top-0 h-fit bg-background flex gap-4 lg:hidden">
                <Button variant="green" type="submit" className="w-fit" form="addUserForm"
                        disabled={processing || hasFormErrors()}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                    {page.props.btnSave.title}
                </Button>
            </div>
            <form
                className={`mt-8 ${processing ? 'invisible' : ''}`}
                id="addUserForm"
                onSubmit={submit}
            >
                <div className="grid lg:grid-cols-[1fr_150px] gap-4 max-w-[1144px] pb-8">
                    <div className="flex flex-col gap-10">
                        {fields.map((field) => (
                            <div className={`grid gap-4 w-full`} key={field.name}>
                                {field.type === "markdown" || field.type === "table" || field.type === "jsonEditor" || field.type === "codeEditor" || field.type === "geoJson" ?
                                    <>
                                        <LabelRenderer field={field}/>
                                        <InputError message={getFieldError(`${field.type}-${field.name}`)}/>
                                        <LazyField
                                            field={field}
                                            value={data[field.name]}

                                            onChange={handleFieldChange}
                                            processing={processing}
                                            invalidFieldMessage={uiMessages["Error: Invalid field data"] || 'Error: Invalid field data'}
                                        />
                                    </>
                                    :
                                    <>
                                        <LabelRenderer field={field}/>
                                        <InputError message={getFieldError(`${field.type}-${field.name}`)}/>
                                        <FieldRenderer
                                            field={field}
                                            value={data[field.name]}
                                            onChange={handleFieldChange}
                                            processing={processing}
                                        />
                                    </>
                                }
                            </div>
                        ))}
                    </div>
                    <div className="p-4 rounded-md h-fit sticky top-[84px] shadow hidden lg:block">
                        <Button variant="green" type="submit" className="w-fit"
                                disabled={processing || hasFormErrors()}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                            {page.props.btnSave.title}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
export default Form
