import {
    createJSONEditor,
    JSONEditorPropsOptional,
    JsonEditor,
    createAjvValidator,
    isTextContent,
    toJSONContent,
    Content,
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

function contentKey(content: any) {
    return content === undefined ? 'undefined' : JSON.stringify(content);
}

// In text mode the editor emits {text}, in tree mode {json}. Consumers expect the parsed
// value, so always hand them {json} and report unparsable text as a field error.
function toJson(content: Content): {json?: unknown; parseError?: string} {
    if (!isTextContent(content)) {
        return {json: content.json};
    }
    if (content.text.trim() === '') {
        return {json: undefined};
    }
    try {
        return {json: toJSONContent(content).json};
    } catch (err) {
        return {parseError: err instanceof Error ? err.message : 'Invalid JSON'};
    }
}

export default function VanillaJSONEditor(props: JSONEditorPropsOptional & Record<string, any>) {
    const refContainer = useRef<HTMLDivElement | null>(null);
    const refEditor = useRef<JsonEditor | null>(null);
    const refPrevProps = useRef<JSONEditorPropsOptional>(props);
    // Serialized content of the last onChange we emitted: the parent feeds it straight back
    // as a prop, and pushing that echo into the editor would rewrite what the user is typing.
    const refEmittedContent = useRef<string | undefined>(undefined);

    const {appearance} = useAppearance()
    const [theme, setTheme] = useState<string>('')

    useEffect(() => {
        const isDark = appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setTheme(isDark ? 'jse-theme-dark' : '');
    }, [appearance]);

    useEffect(()=>{
       if(refEditor.current){
           const content = normalizeContent(props.content, props.json);
           if (contentKey(content) === refEmittedContent.current) {
               return;
           }
           refEditor.current.updateProps({content})
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
                    const {json, parseError} = toJson(content);

                    if (parseError) {
                        setFieldError(props.name, true, parseError);
                    } else if (validator) {
                        const isEmpty = json === undefined
                        const validationError = isEmpty
                            ? ['error']
                            : (status.contentErrors as ContentValidationErrors)?.validationErrors;

                        setFieldError(props.name, !!validationError?.length, 'Error validation JSON schema');
                    } else {
                        setFieldError(props.name, false);
                    }

                    if (props.onChange) {
                        refEmittedContent.current = contentKey(normalizeContent(json, undefined));
                        props.onChange({json} as Content, previousContent, status);
                    }
                }
            }
        });

        // Trigger onChange manually
        if (refEditor.current) {
            // Get the current content
            const {json, parseError} = toJson(refEditor.current.get());

            // Validate the content
            const validationResult = refEditor.current.validate();
            // @ts-ignore
            const hasErrors = !!validationResult?.validationErrors?.length;


            if (props.onChange) {
                refEmittedContent.current = contentKey(normalizeContent(json, undefined));
                props.onChange(
                    {json} as Content,
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
            setFieldError(props.name, hasErrors || !!parseError, parseError ?? 'Error validation JSON schema');
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
                const content = normalizeContent(props.content, props.json);
                if (contentKey(content) === refEmittedContent.current) {
                    delete changedProps.content;
                } else {
                    changedProps.content = content;
                }
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
