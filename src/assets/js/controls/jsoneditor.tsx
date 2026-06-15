import "vanilla-jsoneditor/themes/jse-theme-dark.css";

import VanillaJSONEditor from "@/components/VanillaJSONEditor";
import type {ControlEntryProps} from "./types";

export const Component = VanillaJSONEditor;

export default function JsonEditorControl({
    initialValue,
    options,
    onChange,
    name,
    disabled,
}: ControlEntryProps) {
    return (
        <VanillaJSONEditor
            {...options}
            content={initialValue as any}
            name={name}
            onChange={onChange}
            disabled={disabled}
        />
    );
}
