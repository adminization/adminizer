import {Control, ControlType, Config, Path} from "../Control";

export class Handsontable implements Control {
    readonly config: Config = {
        rowHeaders: true,
        height: 'auto',
        width: 'auto',
        manualColumnResize: true,
        contextMenu: true,
        licenseKey: 'non-commercial-and-evaluation', // for non-commercial use only
    };
    readonly name: string = "handsontable";
    readonly path: Path;
    readonly type: ControlType = 'table';

    constructor(routePrefix: string) {
        this.path = {
            cssPath: `${routePrefix}/assets/controls/handsontable.css`,
            jsPath: {
                dev: "/src/assets/js/controls/handsontable.tsx",
                production: `${routePrefix}/assets/controls/handsontable.es.js`
            }
        };
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
