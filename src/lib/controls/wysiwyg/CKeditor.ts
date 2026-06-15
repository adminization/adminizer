import {Control, ControlType, Config, Path} from "../Control";

export class CKeditor implements Control {
    readonly name: string = 'ckeditor';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path;
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

    constructor(routePrefix: string) {
        this.path = {
            cssPath: `${routePrefix}/assets/controls/ckeditor.css`,
            jsPath: {
                dev: "/src/assets/js/controls/ckeditor.tsx",
                production: `${routePrefix}/assets/controls/ckeditor.es.js`
            }
        };
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
