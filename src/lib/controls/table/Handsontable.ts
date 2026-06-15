import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class Handsontable extends AbstractControls{
    readonly config: Config = {
        rowHeaders: true,
        height: 'auto',
        width: 'auto',
        manualColumnResize: true,
        contextMenu: true,
        licenseKey: 'non-commercial-and-evaluation', // for non-commercial use only
    };
    readonly name: string = "handsontable";
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/controls/handsontable.css`,
        jsPath:
            {
                dev: "/src/assets/js/controls/handsontable.tsx",
                production: `${this.routPrefix}/assets/controls/handsontable.es.js`
            }
    }
    readonly type: ControlType = 'table';

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config | undefined {
        return this.config;
    }

    getName(): string {
        return this.name;
    }

    getJsPath(): string {
        return process.env.ADMINIZER_ENV === 'dev'
            ? this.path.jsPath.dev
            : this.path.jsPath.production;
    }

    getCssPath(): string | undefined {
        return process.env.ADMINIZER_ENV === 'dev' ? undefined : this.path.cssPath;
    }

}
