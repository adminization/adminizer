import {AbstractControls, ControlType, Path, Config } from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class JsonEditor extends AbstractControls{
    readonly config: Record<string, string | string[] | object | number | boolean> = {};
    readonly name: string = 'jsoneditor';
    readonly path: Path = {
        cssPath: "",
        jsPath:
            {
                dev: "",
                production: ""
            }
    }
    readonly type: ControlType = 'jsonEditor';

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config | undefined {
        return this.config;
    }

    getJsPath(): undefined {
        return undefined;
    }

    getCssPath(): undefined {
        return undefined
    }

    getName(): string {
        return this.name;
    }
}
