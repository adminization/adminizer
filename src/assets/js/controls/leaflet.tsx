import "leaflet/dist/leaflet.css";

import GeoJsonEditor from "@/components/geo-json";
import type {ControlEntryProps} from "./types";

export const Component = GeoJsonEditor;

export default function LeafletControl({
    initialValue,
    options,
    onChange,
    disabled,
}: ControlEntryProps<any[]>) {
    return (
        <GeoJsonEditor
            {...options}
            initialFeatures={initialValue ?? []}
            onFeaturesChange={onChange}
            disabled={disabled}
        />
    );
}
