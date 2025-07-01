import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../../Adminizer";

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
        cssPath: "",
        jsPath:
            {
                dev: "",
                production: ""
            },
        viewJsPath: {
            dev: "",
            production: ""
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

    getJsPath(): undefined {
        return undefined;
    }

    getViewJsPath(): undefined {
        return undefined;
    }

    getCssPath(): undefined {
        return undefined
    }

}
