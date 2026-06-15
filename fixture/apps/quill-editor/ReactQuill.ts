import path from "path";
import {AbstractAdminizerApp} from "../../../dist";
import type {AppSetupContext, Config} from "../../../dist";

interface ReactQuillAppConfig {
    config: Config;
    componentFile: string;
    componentDevUrl: string;
    stylesheetFile: string;
    stylesheetDevUrl: string;
}

export class ReactQuillApp extends AbstractAdminizerApp<ReactQuillAppConfig> {
    readonly name = "react-quill";
    readonly version = "1.0.0";
    declare readonly config: ReactQuillAppConfig;

    constructor(config: Partial<ReactQuillAppConfig> = {}) {
        super();
        this.config = {
            config: {},
            componentFile: path.resolve(import.meta.dirname, "react-quill-editor.es.js"),
            componentDevUrl: "/fixture/apps/quill-editor/react-quill-editor.tsx",
            stylesheetFile: path.resolve(import.meta.dirname, "react-quill-editor.css"),
            stylesheetDevUrl: "/fixture/apps/quill-editor/react-quill-editor.css",
            ...config,
        };
    }

    setup(ctx: AppSetupContext): void {
        ctx.control({
            type: "wysiwyg",
            name: "react-quill",
            config: this.config.config,
            component: {
                id: "editor",
                filePath: this.config.componentFile,
                devUrl: this.config.componentDevUrl,
            },
            stylesheet: {
                id: "editor-css",
                filePath: this.config.stylesheetFile,
                devUrl: this.config.stylesheetDevUrl,
            },
        });
    }
}
