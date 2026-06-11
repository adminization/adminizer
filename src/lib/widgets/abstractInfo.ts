import { BaseWidget } from "./abstractWidgetBase";

export interface WidgetInfoContext {
	user?: ReqType["user"];
}

export abstract class InfoBase extends BaseWidget {

	public readonly widgetType = "info"

	/** Widget background css color */
	public readonly backgroundCSS: string;

	/** Widget size */
	public readonly size: {
		h: number
		w: number
	} | null = null

	/** Link */
	public readonly link?: string;

	/** Link type */
	public readonly linkType?: 'self' | 'blank';

	/** Get info */
	public abstract getInfo(context?: WidgetInfoContext): Promise<string>
}
