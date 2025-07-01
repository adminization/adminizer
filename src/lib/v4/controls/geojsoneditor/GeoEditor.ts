import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../../Adminizer";

export class GeoEditor extends AbstractControls{
    readonly config: Config = {
        mode: "all"
    };
    readonly name: string = "leaflet";
    readonly path: Path = {
        cssPath: "", jsPath: {dev: "", production: ""},
        viewJsPath: {dev: "", production: ""}
    };
    readonly type: ControlType = 'geoJson';

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config | undefined {
        return this.config;
    }

    getCssPath(): string | undefined {
        return undefined;
    }

    getJsPath(): string | undefined {
        return undefined;
    }

    getViewJsPath(): string | undefined {
        return undefined;
    }

    getName(): string {
        return this.name;
    }

}
