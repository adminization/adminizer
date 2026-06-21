import { Editor, EditorProps } from '@toast-ui/react-editor';
import { useCallback, useRef, useEffect, useMemo } from "react";
import useWindowSize from "@/hooks/use-window-size.ts";
import { useAppearance } from "@/hooks/use-appearance.tsx";

import '@toast-ui/editor/dist/i18n/ar'
import '@toast-ui/editor/dist/i18n/zh-cn'
import '@toast-ui/editor/dist/i18n/zh-tw'
import '@toast-ui/editor/dist/i18n/hr-hr'
import '@toast-ui/editor/dist/i18n/cs-cz'
import '@toast-ui/editor/dist/i18n/nl-nl'
import '@toast-ui/editor/dist/i18n/en-us'
import '@toast-ui/editor/dist/i18n/fi-fi'
import '@toast-ui/editor/dist/i18n/fr-fr'
import '@toast-ui/editor/dist/i18n/gl-es'
import '@toast-ui/editor/dist/i18n/de-de'
import '@toast-ui/editor/dist/i18n/it-it'
import '@toast-ui/editor/dist/i18n/ja-jp'
import '@toast-ui/editor/dist/i18n/ko-kr'
import '@toast-ui/editor/dist/i18n/nb-no'
import '@toast-ui/editor/dist/i18n/pl-pl'
import '@toast-ui/editor/dist/i18n/pt-br'
import '@toast-ui/editor/dist/i18n/ru-ru'
import '@toast-ui/editor/dist/i18n/es-es'
import '@toast-ui/editor/dist/i18n/sv-se'
import '@toast-ui/editor/dist/i18n/tr-tr'
import '@toast-ui/editor/dist/i18n/uk-ua'

interface TuiEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    options?: EditorProps;
    disabled?: boolean;
}

const supportedLanguages: string[] = [
    'ar',
    'zh',
    'hr',
    'cs',
    'nl',
    'en',
    'fi',
    'fr',
    'gl',
    'de',
    'it',
    'ja',
    'ko',
    'nb',
    'pl',
    'pt',
    'ru',
    'es',
    'sv',
    'tr',
    'uk',
];

const docLang = document.documentElement.lang

const lang = supportedLanguages.includes(docLang) ? docLang : 'en'

const defaultEditorOptions: EditorProps = {
    height: '600px',
    initialEditType: 'markdown',
    useCommandShortcut: true,
    language: lang,
};

const ToastEditor = ({ initialValue, onChange, options, disabled }: TuiEditorProps) => {
    const editorRef = useRef<Editor>(null);
    const { width } = useWindowSize();
    const { appearance } = useAppearance();
    const theme = appearance === 'dark' ? 'dark' : 'light';
    const isMobileView = width < 1200;
    const editorOptions = useMemo<EditorProps>(() => ({
        ...defaultEditorOptions,
        ...options,
        previewStyle: isMobileView ? 'tab' : options?.previewStyle || 'vertical',
        height: options?.height || '600px',
        initialEditType: options?.initialEditType || 'markdown',
        useCommandShortcut: options?.useCommandShortcut !== undefined
            ? options.useCommandShortcut
            : true,
    }), [isMobileView, options]);

      // ✅ Set the value during the first render
    useEffect(() => {
        if (editorRef.current && initialValue) {
            const editorInstance = editorRef.current.getInstance();
            if (!editorInstance.getMarkdown().trim()) {
                editorInstance.setMarkdown(initialValue);
            }
        }
    }, []);

    
    useEffect(() => {
        if (editorRef.current && initialValue !== undefined) {
            const editorInstance = editorRef.current.getInstance();
            const current = editorInstance.getMarkdown();
            if (current !== initialValue) {
                editorInstance.setMarkdown(initialValue);
            }
        }
    }, [initialValue])

    useEffect(() => {
        if (editorRef.current) {
            const editorInstance = editorRef.current.getInstance();
            editorInstance.changePreviewStyle(isMobileView ? 'tab' : options?.previewStyle || 'vertical');
        }
    }, [isMobileView, options?.previewStyle]);
    
    const handleEditorChange = useCallback(() => {
        const editorInstance = editorRef.current?.getInstance();
        const markdown = editorInstance?.getMarkdown();
        
        if (onChange && markdown) {
            onChange(markdown);
        }
    }, [onChange]);
    
    return (
        <div className={`${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            <Editor
                key={`editor-${theme}-${lang}`}
                ref={editorRef}
                onChange={handleEditorChange}
                autofocus={false}
                theme={theme}
                {...editorOptions}
            />
        </div>
    );
};

export default ToastEditor;
