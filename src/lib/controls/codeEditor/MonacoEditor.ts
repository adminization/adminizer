import {Control, ControlType, Config, Path} from "../Control";

export class MonacoEditor implements Control {
    readonly config: Config = {
        language: "javascript",
    };
    readonly name: string = 'monaco';
    readonly path: Path;
    readonly type: ControlType = 'codeEditor';

    constructor(routePrefix: string) {
        this.path = {
            cssPath: "",
            jsPath: {
                dev: "/src/assets/js/controls/monaco.tsx",
                production: `${routePrefix}/assets/controls/monaco.es.js`
            }
        };
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
