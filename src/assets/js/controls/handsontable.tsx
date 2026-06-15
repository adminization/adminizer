import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";

import HandsonTable from "@/components/handsontable";
import type {ControlEntryProps} from "./types";

export const Component = HandsonTable;

export default function HandsontableControl({
    initialValue,
    options,
    onChange,
    disabled,
}: ControlEntryProps<any[]>) {
    return (
        <HandsonTable
            data={initialValue ?? []}
            config={options ?? {}}
            onChange={onChange}
            disabled={disabled}
        />
    );
}
