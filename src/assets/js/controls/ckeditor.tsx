import AdminCKEditor from "@/components/ckeditor/ckeditor";
import type {ControlEntryProps} from "./types";

export const Component = AdminCKEditor;

export default function CKEditorControl({
    initialValue,
    options,
    onChange,
    disabled,
}: ControlEntryProps<string>) {
    return (
        <AdminCKEditor
            initialValue={initialValue ?? ""}
            options={options as {items: string[]}}
            onChange={onChange}
            disabled={disabled}
        />
    );
}
