import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../../Adminizer";

export class CKeditor extends AbstractControls {
    readonly name: string = 'ckeditor';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        cssPath: "",
        jsPath:
            {
                dev: "",
                production: ""
            },
        viewJsPath: {dev: "", production: ""}
    }
    readonly config: Config = {
        items: [
            'sourceEditing',
            'showBlocks',
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'horizontalLine',
            'link',
            'insertImageViaUrl',
            'insertTable',
            'blockQuote',
            '|',
            'alignment',
            '|',
            'bulletedList',
            'numberedList',
            'outdent',
            'indent',
        ],
    };

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config {
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
        return this.name
    }

}
