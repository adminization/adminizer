import {createLazyControl} from "@/components/control-loader";
import {getLazyControlPaths} from "@/js-components/control-paths";

const VanillaJSONEditor = createLazyControl<any>(
    () => getLazyControlPaths("jsoneditor").modulePath,
    () => getLazyControlPaths("jsoneditor").cssPath,
    "Component"
);

export default VanillaJSONEditor;
