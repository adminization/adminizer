import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../../Adminizer";

export class MonacoEditor extends AbstractControls{
    readonly config: Config = {
        language: "javascript",
    };
    readonly name: string = 'monaco';
    readonly path: Path = {
        cssPath: "", jsPath: {dev: "", production: ""},
        viewJsPath: {dev: "", production: ""}
    };
    readonly type: ControlType = 'codeEditor';

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config {
        return this.config;
    }

    getCssPath(): string | undefined {
        return undefined;
    }

    getJsPath(): string | undefined {
        return undefined;
    }

    getViewJsPath(): string | undefined {
        return undefined;
    }

    getName(): string {
        return this.name;
    }
}
