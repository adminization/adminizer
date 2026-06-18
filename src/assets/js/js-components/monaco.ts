import {createLazyControl} from "@/components/control-loader";
import {getLazyControlPaths} from "@/js-components/control-paths";

const MonacoEditor = createLazyControl<any>(
    () => getLazyControlPaths("monaco").modulePath,
    () => getLazyControlPaths("monaco").cssPath,
    "Component"
);

export default MonacoEditor;
