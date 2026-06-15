export type ControlType = 'wysiwyg' | 'jsonEditor' | 'geoJson' | 'markdown' | 'table' | 'codeEditor'

export interface Path {
    jsPath: {
        dev: string
        production: string
    },
    cssPath: string
}

export type Config = Record<string, string | string[] | object | number | boolean>

export interface Control {
    readonly name: string;
    readonly type: ControlType;

    getConfig(): Config | undefined
    getJsPath(): string | undefined
    getCssPath(): string | undefined
    getName(): string
}
