import {AbstractControls, ControlType, Path, Config } from "../AbstractControls";
import {EditorOptions} from "@toast-ui/editor/types/editor";
import {Adminizer} from "../../../Adminizer";

export class JsonEditor extends AbstractControls{
    readonly config: Partial<EditorOptions> = {};
    readonly name: string = 'jsoneditor';
    readonly path: Path = {
        cssPath: "",
        jsPath:
            {
                dev: "",
                production: ""
            },
        viewJsPath: {dev: "", production: ""}
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

    getViewJsPath(): undefined {
        return undefined;
    }

    getCssPath(): undefined {
        return undefined
    }

    getName(): string {
        return this.name;
    }
}
