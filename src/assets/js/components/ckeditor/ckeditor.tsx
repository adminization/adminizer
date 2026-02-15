import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Alignment,
    Autosave,
    BlockQuote,
    Bold,
    Essentials,
    Heading,
    HorizontalLine,
    ImageBlock,
    ImageCaption,
    ImageInline,
    ImageInsert,
    ImageInsertViaUrl,
    ImageResize,
    ImageStyle,
    ImageTextAlternative,
    ImageToolbar,
    ImageUpload,
    Italic,
    Link,
    List,
    ListProperties,
    Paragraph,
    ShowBlocks,
    SourceEditing,
    SimpleUploadAdapter,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    Underline,
    EditorConfig,
    Editor,
    EventInfo
} from 'ckeditor5';

import plTranslations from 'ckeditor5/translations/pl.js';
import arTranslations from 'ckeditor5/translations/ar.js';
import znTranslations from 'ckeditor5/translations/zh.js';
import deTranslations from 'ckeditor5/translations/de.js';
import esTranslations from 'ckeditor5/translations/es.js';
import frTranslations from 'ckeditor5/translations/fr.js';
import hiTranslations from 'ckeditor5/translations/hi.js';
import koTranslations from 'ckeditor5/translations/ko.js';
import ptTranslations from 'ckeditor5/translations/pt.js';
import ruTanslations from 'ckeditor5/translations/ru.js';
import viTanslations from 'ckeditor5/translations/vi.js';
import enTanslations from 'ckeditor5/translations/en.js';

import 'ckeditor5/ckeditor5.css';
import UploadAdapterPlugin from './uploadAdapterPlugin';

interface EditorProps {
    initialValue: string;
    onChange: (value: string) => void;
    options: { items: string[] };
    disabled?: boolean;
}

const languageMap: Record<string, any> = {
    'pl': plTranslations,
    'ar': arTranslations,
    'zn': znTranslations,
    'de': deTranslations,
    'es': esTranslations,
    'fr': frTranslations,
    'hi': hiTranslations,
    'ko': koTranslations,
    'pt': ptTranslations,
    'ru': ruTanslations,
    'vi': viTanslations,
    'en': enTanslations,
};

const docLang = document.documentElement.lang;
const translations = languageMap[docLang] || languageMap['en'];

export default function AdminCKEditor({ initialValue, onChange, options, disabled }: EditorProps) {
    const editorRef = useRef<ClassicEditor | null>(null);
    const [isLayoutReady, setIsLayoutReady] = useState(false);

    useEffect(() => {
        setIsLayoutReady(true);
        return () => setIsLayoutReady(false);
    }, []);

    const editorConfig = useMemo<EditorConfig>(() => {
        if (!isLayoutReady) return {};

        return {
            translations: [translations],
            toolbar: {
                items: options?.items ?? [],
                shouldNotGroupWhenFull: true,
            },
            plugins: [
                Alignment,
                Autosave,
                BlockQuote,
                Bold,
                Essentials,
                Heading,
                HorizontalLine,
                ImageBlock,
                ImageCaption,
                ImageInline,
                ImageInsertViaUrl,
                ImageResize,
                ImageStyle,
                ImageTextAlternative,
                ImageToolbar,
                ImageUpload,
                UploadAdapterPlugin,
                ImageInsert,
                Italic,
                Link,
                List,
                ListProperties,
                Paragraph,
                ShowBlocks,
                SourceEditing,
                SimpleUploadAdapter,
                Table,
                TableCaption,
                TableCellProperties,
                TableColumnResize,
                TableProperties,
                TableToolbar,
                Underline,
            ],
            heading: {
                options: [
                    { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                    { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                    { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                    { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                    { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
                    { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
                    { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' },
                ],
            },
            image: {
                toolbar: [
                    'toggleImageCaption',
                    'imageTextAlternative',
                    '|',
                    'imageStyle:inline',
                    'imageStyle:wrapText',
                    'imageStyle:breakText',
                    '|',
                    'resizeImage',
                ],
            },
            initialData: initialValue,
            licenseKey: 'GPL',
            link: {
                addTargetToExternalLinks: true,
                defaultProtocol: 'https://',
                decorators: {
                    toggleDownloadable: {
                        mode: 'manual',
                        label: 'Downloadable',
                        attributes: { download: 'file' },
                    },
                },
            },
            list: {
                properties: { styles: true, startIndex: true, reversed: true },
            },
            placeholder: '',
            table: {
                contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties'],
            },
        };
    }, [isLayoutReady, options, translations, initialValue]);

    const handleEditorChange = useCallback((event: EventInfo, editor: ClassicEditor) => {
        const data = editor.getData();
        onChange(data);
    }, [onChange]);

    const handleEditorReady = useCallback((editor: ClassicEditor) => {
        editorRef.current = editor;
    }, []);

    // We update the data in the editor when the initialValue changes
    useEffect(() => {
        if (editorRef.current) {
            const currentData = editorRef.current.getData();
            if (currentData !== initialValue) {
                editorRef.current.setData(initialValue);
            }
        }
    }, [initialValue]);

    return (
        <div className={`max-fit ${disabled ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}>
            <div className="editor-container editor-container_classic-editor">
                <div className="editor-container__editor">
                    <div>
                        {isLayoutReady && (
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfig}
                                onChange={handleEditorChange}
                                onReady={handleEditorReady}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
