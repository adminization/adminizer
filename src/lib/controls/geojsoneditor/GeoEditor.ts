import {Control, ControlType, Config, Path} from "../Control";

export class GeoEditor implements Control {
    readonly config: Config = {
        mode: "all"
    };
    readonly name: string = "leaflet";
    readonly path: Path;
    readonly type: ControlType = 'geoJson';

    constructor(routePrefix: string) {
        this.path = {
            cssPath: `${routePrefix}/assets/controls/leaflet.css`,
            jsPath: {
                dev: "/src/assets/js/controls/leaflet.tsx",
                production: `${routePrefix}/assets/controls/leaflet.es.js`
            }
        };
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
