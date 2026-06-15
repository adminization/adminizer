import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";
import {Adminizer} from "../../Adminizer";

export class GeoEditor extends AbstractControls{
    readonly config: Config = {
        mode: "all"
    };
    readonly name: string = "leaflet";
    readonly path: Path = {
        cssPath: `${this.routPrefix}/assets/controls/leaflet.css`,
        jsPath: {
            dev: "/src/assets/js/controls/leaflet.tsx",
            production: `${this.routPrefix}/assets/controls/leaflet.es.js`
        }
    };
    readonly type: ControlType = 'geoJson';

    constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    getConfig(): Config | undefined {
        return this.config;
    }

    getCssPath(): string | undefined {
        return process.env.ADMINIZER_ENV === 'dev' ? undefined : this.path.cssPath;
    }

    getJsPath(): string | undefined {
        return process.env.ADMINIZER_ENV === 'dev'
            ? this.path.jsPath.dev
            : this.path.jsPath.production;
    }

    getName(): string {
        return this.name;
    }

}
