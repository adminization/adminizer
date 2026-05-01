import {
    createJSONEditor,
    JSONEditorPropsOptional,
    JsonEditor,
    createAjvValidator,
    JSONSchema, OnChangeStatus, ContentValidationErrors
} from 'vanilla-jsoneditor';
import {useEffect, useRef, useState} from 'react';
import {useAppearance} from "@/hooks/use-appearance";
import {setFieldError} from "@/hooks/form-state";

function normalizeContent(content: any, json: any) {
    if (content !== undefined) {
        return content && typeof content === 'object' && ('json' in content || 'text' in content)
            ? content
            : {json: content};
    }
    return json !== undefined ? {json} : undefined;
}

export default function VanillaJSONEditor(props: JSONEditorPropsOptional & Record<string, any>) {
    const refContainer = useRef<HTMLDivElement | null>(null);
    const refEditor = useRef<JsonEditor | null>(null);
    const refPrevProps = useRef<JSONEditorPropsOptional>(props);

    const {appearance} = useAppearance()
    const [theme, setTheme] = useState<string>('')

    useEffect(() => {
        if (appearance === 'dark') {
            setTheme('jse-theme-dark');
        } else {
            setTheme('');
        }
    }, [appearance]);

    useEffect(()=>{
       if(refEditor.current){
           refEditor.current.updateProps({
               content: normalizeContent(props.content, props.json)
           })
       }
       
    }, [props.content, props.json])

    useEffect(() => {
        const validator = props.schema ? createAjvValidator({schema: props.schema as JSONSchema}) : undefined;
        const content = normalizeContent(props.content, props.json);

        refEditor.current = createJSONEditor({
            target: refContainer.current as HTMLDivElement,
            props: {
                ...props,
                validator,
                content,
                onChange: (content: any, previousContent: any, status: OnChangeStatus) => {
                    if (validator) {
                        const isEmpty = content.json === undefined
                        const validationError = isEmpty
                            ? ['error']
                            : (status.contentErrors as ContentValidationErrors)?.validationErrors;

                        setFieldError(props.name, !!validationError?.length, 'Error validation JSON schema');
                    }
                    if (props.onChange) {
                        props.onChange(content, previousContent, status);
                    }
                }
            }
        });

        // Trigger onChange manually
        if (refEditor.current) {
            // Get the current content
            const currentContent = refEditor.current.get();

            // Validate the content
            const validationResult = refEditor.current.validate();
            // @ts-ignore
            const hasErrors = !!validationResult?.validationErrors?.length;


            if (props.onChange) {
                props.onChange(
                    currentContent,
                    //@ts-ignore
                    undefined,
                    {
                        contentErrors: validationResult,
                        patchResult: undefined,
                        isUndo: false,
                        isRedo: false,
                        isValid: !hasErrors
                    }
                );
            }

            // Set the error state
            setFieldError(props.name, hasErrors, 'Error validation JSON schema');
        }

        return () => {
            // destroy editor
            if (refEditor.current) {
                refEditor.current.destroy();
                refEditor.current = null;
            }
        };
    }, [props.schema]);

    // update props
    useEffect(() => {
        if (refEditor.current) {
            // only pass the props that actually changed
            // since the last time to prevent syncing issues
            const changedProps = filterUnchangedProps(props, refPrevProps.current);
            if ('content' in changedProps || 'json' in changedProps) {
                changedProps.content = normalizeContent(props.content, props.json);
                delete (changedProps as Record<string, any>).json;
            }
            if ('schema' in changedProps) {
                changedProps.validator = props.schema ? createAjvValidator({schema: props.schema as JSONSchema}) : undefined;
                delete changedProps.schema;
            }
            refEditor.current.updateProps(changedProps);
            refPrevProps.current = props;
        }
    }, [props]);

    return <div className={`vanilla-jsoneditor-react ${theme} ${props.disabled ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`} ref={refContainer}></div>;
}

function filterUnchangedProps(
    props: JSONEditorPropsOptional,
    prevProps: JSONEditorPropsOptional
): JSONEditorPropsOptional {
    const changedProps: JSONEditorPropsOptional = {};

    for (const [key, value] of Object.entries(props)) {
        if (key === 'content') {
            const currentJson = JSON.stringify(normalizeContent(value, undefined));
            // @ts-ignore
            const prevJson = JSON.stringify(normalizeContent(prevProps[key], undefined));
            if (currentJson !== prevJson) {
                changedProps[key] = value;
            }
        } else if (value !== prevProps[key as keyof JSONEditorPropsOptional]) {
            changedProps[key as keyof JSONEditorPropsOptional] = value;
        }
    }

    return changedProps;
}
