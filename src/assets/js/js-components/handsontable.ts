import {createLazyControl} from "@/components/control-loader";
import {getLazyControlPaths} from "@/js-components/control-paths";

const HandsonTable = createLazyControl<any>(
    () => getLazyControlPaths("handsontable").modulePath,
    () => getLazyControlPaths("handsontable").cssPath,
    "Component"
);

export default HandsonTable;
