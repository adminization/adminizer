import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class MonacoEditor extends AbstractControls{
    readonly config: Config = {
        language: "javascript",
    };
    readonly name: string = 'monaco';
    readonly path: Path = {
        cssPath: "",
        jsPath: {
            dev: "/src/assets/js/controls/monaco.tsx",
            production: `${this.routPrefix}/assets/controls/monaco.es.js`
        }
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
        return process.env.ADMINIZER_ENV === 'dev'
            ? this.path.jsPath.dev
            : this.path.jsPath.production;
    }

    getName(): string {
        return this.name;
    }
}
