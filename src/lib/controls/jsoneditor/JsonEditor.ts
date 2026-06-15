import {AbstractControls, ControlType, Path, Config } from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class JsonEditor extends AbstractControls{
    readonly config: Record<string, string | string[] | object | number | boolean> = {};
    readonly name: string = 'jsoneditor';
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/controls/jsoneditor.css`,
        jsPath:
            {
                dev: "/src/assets/js/controls/jsoneditor.tsx",
                production: `${this.routPrefix}/assets/controls/jsoneditor.es.js`
            }
    }
    readonly type: ControlType = 'jsonEditor';

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config | undefined {
        return this.config;
    }

    getJsPath(): string {
        return process.env.ADMINIZER_ENV === 'dev'
            ? this.path.jsPath.dev
            : this.path.jsPath.production;
    }

    getCssPath(): string | undefined {
        return process.env.ADMINIZER_ENV === 'dev' ? undefined : this.path.cssPath;
    }

    getName(): string {
        return this.name;
    }
}
