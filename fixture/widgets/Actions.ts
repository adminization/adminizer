import ActionBase from "../../src/lib/v4/widgets/abstractAction";

export class ActionOne extends  ActionBase{
    icon?: string;
	public backgroundCSS: string;
	readonly id: string = 'action_one'
	readonly department: string = 'test'
	readonly description: string = 'Action One'
	readonly name: string = 'Action One'
	readonly widgetType = "action"
	readonly size = {
		h: 2,
		w: 2
	}

	action(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(true)
			}, 2000)
		})
	}

}

export class ActionTwo extends  ActionBase{
    icon?: string;
	public backgroundCSS: string;
	readonly id: string = 'action_two'
	readonly department: string = 'test'
	readonly description: string = 'Action Two'
	readonly name: string = 'Action Two'
	readonly widgetType = "action"
	readonly size = {
		h: 2,
		w: 2
	}

	action(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve(true)
			}, 2500)
		})
	}

}
