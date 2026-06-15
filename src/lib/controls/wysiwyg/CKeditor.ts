import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class CKeditor extends AbstractControls {
    readonly name: string = 'ckeditor';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/controls/ckeditor.css`,
        jsPath:
            {
                dev: "/src/assets/js/controls/ckeditor.tsx",
                production: `${this.routPrefix}/assets/controls/ckeditor.es.js`
            }
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
            'insertImage',
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

    getJsPath(): string {
        return process.env.ADMINIZER_ENV === 'dev'
            ? this.path.jsPath.dev
            : this.path.jsPath.production;
    }

    getCssPath(): string | undefined {
        return process.env.ADMINIZER_ENV === 'dev' ? undefined : this.path.cssPath;
    }

    getName(): string {
        return this.name
    }

}
