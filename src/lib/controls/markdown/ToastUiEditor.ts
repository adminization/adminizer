import {AbstractControls, ControlType, Path, Config } from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class ToastUiEditor extends AbstractControls{
    readonly config: Record<string, string | string[] | object | number | boolean> = {
        hideModeSwitch: true,
        height: '400px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
    };
    readonly name: string = 'toast-ui';
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/controls/toast-ui.css`,
        jsPath:
            {
                dev: "/src/assets/js/controls/toast-ui.tsx",
                production: `${this.routPrefix}/assets/controls/toast-ui.es.js`
            }
    }
    readonly type: ControlType = 'markdown';

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
