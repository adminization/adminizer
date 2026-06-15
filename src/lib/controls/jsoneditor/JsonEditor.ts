import {Control, ControlType, Path, Config } from "../Control";

export class JsonEditor implements Control {
    readonly config: Record<string, string | string[] | object | number | boolean> = {};
    readonly name: string = 'jsoneditor';
    readonly path: Path;
    readonly type: ControlType = 'jsonEditor';

    constructor(routePrefix: string) {
        this.path = {
            cssPath: `${routePrefix}/assets/controls/jsoneditor.css`,
            jsPath: {
                dev: "/src/assets/js/controls/jsoneditor.tsx",
                production: `${routePrefix}/assets/controls/jsoneditor.es.js`
            }
        };
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
