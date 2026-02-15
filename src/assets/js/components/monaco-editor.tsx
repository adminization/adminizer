import Editor from '@monaco-editor/react';
import {FC, useEffect, useRef, useState} from "react";
import {useAppearance} from "@/hooks/use-appearance";
import useWindowSize from "@/hooks/use-window-size";

interface MonacoEditorProps {
    onChange: (value: string) => void;
    value: string
    options: {language: string},
    disabled?: boolean
}

const MonacoEditor: FC<MonacoEditorProps> = ({ onChange, value, options, disabled }) => {
    const { appearance } = useAppearance();
    const [theme, setTheme] = useState<string>('light');
    const editorRef = useRef<any>(null);
    const editorWrapperRef = useRef<HTMLDivElement>(null);
    const { width } = useWindowSize();

    // Device type detection
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;

    const handleEditorChange = (value: string | undefined) => {
        onChange(value as string);
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        updateEditorOptions();
    };

    const updateEditorOptions = () => {
        if (!editorRef.current) return;

        const options = {
            minimap: { enabled: !isMobile },
            fontSize: isMobile ? 12 : isTablet ? 13 : 14,
            lineNumbers: isMobile ? 'off' : 'on',
            lineDecorationsWidth: isMobile ? 5 : 10,
            scrollBeyondLastLine: !isMobile,
            wordWrap: isMobile ? 'on' : 'bounded',
            renderWhitespace: isMobile ? 'none' : 'selection',
            padding: { top: isMobile ? 8 : 16, bottom: isMobile ? 8 : 16 }
        };

        editorRef.current.updateOptions(options);
        editorWrapperRef.current?.classList.add('overflow-hidden')

        // Small delay to ensure that the editor has been fully rendered
        setTimeout(() => {
            editorRef.current?.layout();
            editorWrapperRef.current?.classList.remove('overflow-hidden')
        }, 100);
    };

    useEffect(() => {
        setTheme(appearance === 'dark' ? 'vs-dark' : 'light');
    }, [appearance]);

    useEffect(() => {
        updateEditorOptions();
    }, [width]);

    // Calculating the height of the editor
    const editorHeight = isMobile ? '300px' : isTablet ? '400px' : '500px';

    return (
        <div className={`border rounded-lg ${isMobile ? 'p-1' : 'p-2'}`} ref={editorWrapperRef}>
            <Editor
                height={editorHeight}
                language={options.language}
                value={value}
                theme={theme}
                options={{
                    automaticLayout: true,
                    ...(isMobile && { wordWrap: 'on' }),
                    minimap: { enabled: !isMobile }
                }}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                className={`transition-all duration-200 ease-in-out ${disabled ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    );
};

export default MonacoEditor;
