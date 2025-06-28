import SwitchBase from "../../src/lib/v4/widgets/abstractSwitch";

export class SwitcherOne extends SwitchBase {
	readonly id: string = 'site_switcher';
	readonly department: string = 'test';
	readonly description: string = 'Widget Switcher One';
	readonly icon: string = 'router';
	readonly name: string = 'Site Switcher';
	readonly widgetType = 'switcher';
	readonly backgroundCSS = '#da4fcf'
	readonly size = {
		h: 3,
		w: 2
	}

	private state: boolean = false

	getState() {
		return Promise.resolve(this.state);
	}

	switchIt(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.state = !this.state
				resolve(this.state)
			}, 1500)
		})
	}
}

export class SwitcherTwo extends SwitchBase {
	public size: { h: number; w: number; } = { h: 3, w: 3};
	readonly id: string = 'switcher_two';
	readonly department: string = 'test_two';
	readonly description: string = 'Widget Switcher Two';
	readonly icon: string = 'router';
	readonly name: string = 'Switcher Two';
	readonly widgetType = 'switcher';
	readonly backgroundCSS = '#779d64'


	private state: boolean = true

	getState() {
		return Promise.resolve(this.state);
	}

	switchIt(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.state = !this.state
				resolve(this.state)
			}, 2500)
		})
	}
}
