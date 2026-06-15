import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";

import ToastEditor from "@/components/toast-editor";
import type {ControlEntryProps} from "./types";

export const Component = ToastEditor;

export default function ToastUiControl({
    initialValue,
    options,
    onChange,
    disabled,
}: ControlEntryProps<string>) {
    return (
        <ToastEditor
            initialValue={initialValue ?? ""}
            options={options}
            onChange={onChange}
            disabled={disabled}
        />
    );
}
