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
        cssPath: "",
        jsPath:
            {
                dev: "",
                production: ""
            }
    }
    readonly type: ControlType = 'markdown';

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
