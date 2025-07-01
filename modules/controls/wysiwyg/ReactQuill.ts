import {AbstractControls, ControlType, Config, Path} from "../../../dist/lib/v4/controls/AbstractControls";
import {Adminizer} from "../../../dist";

export class ReactQuill extends AbstractControls {
    readonly name: string = 'react-quill';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/modules/react-quill-editor.css`,
        jsPath:
            {
                dev: "/modules/controls/wysiwyg/react-quill-editor.tsx",
                production: `${this.routPrefix}/assets/modules/react-quill-editor.es.js`
            },
        viewJsPath: {
            dev: "/modules/controls/wysiwyg/react-quill-editor.tsx",
            production: `${this.routPrefix}/assets/modules/react-quill-editor.es.js`
        }
    }
    readonly config: Config = {};

    getConfig(): Config {
        return this.config;
    }

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getJsPath(): string {
        if (process.env.VITE_ENV === 'dev') {
            return this.path.jsPath.dev;
        } else {
            return this.path.jsPath.production
        }
    }

    getViewJsPath(): string {
        if (process.env.VITE_ENV === 'dev') {
            return this.path.viewJsPath!.dev;
        } else {
            return this.path.viewJsPath!.production;
        }
    }

    getCssPath(): string {
        return this.path.cssPath
    }

    getName(): string {
        return this.name
    }
}
