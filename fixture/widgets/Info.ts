import InfoBase from "../../src/lib/v4/widgets/abstractInfo";

export class InfoOne extends InfoBase {
    icon?: string;
    declare public backgroundCSS: string;
	public size: { h: number; w: number; } = {h: 3, w: 2};
	readonly id: string = 'info_one';
	readonly department: string = 'test';
	readonly description: string = 'Info widget One'
	readonly name: string = 'Info One';
	readonly widgetType = "info";

	private info: string = 'Lorem ipsum'

	getInfo(): Promise<string> {
		return Promise.resolve(this.info);
	}

}

export class InfoTwo extends InfoBase {
    icon?: string;
	readonly id: string = 'info_two';
	readonly department: string = 'test';
	readonly description: string = 'Info widget Two'
	readonly name: string = 'Info Two';
	readonly widgetType = "info";
	readonly backgroundCSS = '#8c3116'
	readonly size = {
		h: 2,
		w: 3
	}

	private info: string = '356'

	getInfo(): Promise<string> {
		return Promise.resolve(this.info);
	}
}

export class Info3 extends InfoBase {
    icon?: string;
    declare public backgroundCSS: string;
	readonly id: string = 'info_3';
	readonly department: string = 'test';
	readonly description: string = 'Info widget 3'
	readonly name: string = 'Info 31111';
	readonly widgetType = "info";
	readonly size = {
		h: 3,
		w: 2
	}

	private info: string = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'

	getInfo(): Promise<string> {
		return Promise.resolve(this.info);
	}
}

export class Info4 extends InfoBase {
    icon?: string;
	readonly id: string = 'info_4';
	readonly department: string = 'test';
	readonly description: string = 'Info widget 4'
	readonly name: string = 'Info 4';
	readonly widgetType = "info";
	readonly backgroundCSS = '#051c3a'

	readonly size = {
		h: 2,
		w: 2
	}

	private info: string = 'Lorem ipsum dolor sit amet.'

	getInfo(): Promise<string> {
		return Promise.resolve(this.info);
	}
}
