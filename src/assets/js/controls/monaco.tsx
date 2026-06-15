import MonacoEditor from "@/components/monaco-editor";
import type {ControlEntryProps} from "./types";

export const Component = MonacoEditor;

export default function MonacoControl({
    initialValue,
    options,
    onChange,
    disabled,
}: ControlEntryProps<string>) {
    return (
        <MonacoEditor
            value={initialValue ?? ""}
            options={options as {language: string}}
            onChange={onChange}
            disabled={disabled}
        />
    );
}
