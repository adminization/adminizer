import {Control, ControlType, Path, Config } from "../Control";

export class ToastUiEditor implements Control {
    readonly config: Record<string, string | string[] | object | number | boolean> = {
        hideModeSwitch: true,
        height: '400px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
    };
    readonly name: string = 'toast-ui';
    readonly path: Path;
    readonly type: ControlType = 'markdown';

    constructor(routePrefix: string) {
        this.path = {
            cssPath: `${routePrefix}/assets/controls/toast-ui.css`,
            jsPath: {
                dev: "/src/assets/js/controls/toast-ui.tsx",
                production: `${routePrefix}/assets/controls/toast-ui.es.js`
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
