import {CKeditor} from "../lib/controls/wysiwyg/CKeditor";
import {ToastUiEditor} from "../lib/controls/markdown/ToastUiEditor";
import {Adminizer} from "../lib/Adminizer";
import {Handsontable} from "../lib/controls/table/Handsontable";
import {JsonEditor} from "../lib/controls/jsoneditor/JsonEditor";
import {MonacoEditor} from "../lib/controls/codeEditor/MonacoEditor";
import {GeoEditor} from "../lib/controls/geojsoneditor/GeoEditor";

export function bindControls(adminizer: Adminizer): void {
    const routePrefix = adminizer.config.routePrefix
    // bind wysiwyg
    adminizer.controlsHandler.add(new CKeditor(routePrefix))
    // bind markdown
    adminizer.controlsHandler.add(new ToastUiEditor(routePrefix))
    // bind table
    adminizer.controlsHandler.add(new Handsontable(routePrefix))
    // bind json editor
    adminizer.controlsHandler.add(new JsonEditor(routePrefix))
    // bind code editor
    adminizer.controlsHandler.add(new MonacoEditor(routePrefix))
    //bind geo json editor
    adminizer.controlsHandler.add(new GeoEditor(routePrefix))
}
