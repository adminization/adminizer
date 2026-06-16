import {CustomBase} from '../../dist';

export class CustomOne extends CustomBase {
    jsPath: { dev: string; production: string; } = {
        dev: '/modules/test/CustomWidget.tsx',
        production: `${this.routePrefix}/assets/modules/CustomWidget.es.js`
    };
    readonly id: string = 'site_custom';
    readonly department: string = 'test';
    readonly description: string = 'Widget Custom One';
    readonly icon: string = 'takeout_dining';
    readonly backgroundCSS = '#d7d4d4'
    readonly name: string = 'Site Custom';
    readonly size = {
        h: 3,
        w: 2
    }

    constructor(routePrefix: string) {
        super(routePrefix);
    }
}
