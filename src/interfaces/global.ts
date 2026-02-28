import { Adminizer } from "../lib/Adminizer";
import {NextFunction, Request, Response} from "express";
import multer from "multer";
import {I18n} from "../lib/I18n";
import {Inertia} from "../lib/inertia/inertiaAdapter";
import {Flash} from "../lib/inertia/flash";
import { UserAP } from "../models/UserAP";
import { GroupAP } from "../models/GroupAP";

declare global {
	/** @deprecated use import from TS model decalration */
	type ModelsAP = {
		// GroupAP: {
		// 	id?: number
		// 	name: string,
		// 	description?: string
		// 	tokens?:string[]
		// 	users?: UserAP[]
		// }

		MediaManagerAP: {
			id?: string
			parent?: ModelsAP["MediaManagerAP"]
			variants?: ModelsAP["MediaManagerAP"][]
			mimeType?: string
			path?: string
			size?: number
			group?: string
			tag?: string
			url?: string
			filename?: string
			meta?: ModelsAP["MediaManagerMetaAP"][]
			modelAssociation?: ModelsAP["MediaManagerAssociationsAP"][]
		}

		MediaManagerAssociationsAP: {
			id?: string
			mediaManagerId?: string
			model?: any
			modelId?: any
			widgetName?: string
			sortOrder?: number
			file?: ModelsAP["MediaManagerAP"]
		}

		MediaManagerMetaAP: {
			id?: string
			key?: string
			value?: any
			isPublic?: boolean
			parent?: ModelsAP["MediaManagerAP"]
		}

		NavigationAP: {
			id?: string
			label: string
			tree: any
		}
	}
    type reqSession = {
        flashMessages: Record<string, string[]>;
        xInertiaCurrentComponent: string | undefined;
        UserAP: UserAP
        messages: {
            adminError: string[],
            adminSuccess: string[]
        }
        userPretended?: UserAP
    }
    type FlashMessages = 'info' | 'error' | 'success' | string;

 	type ReqType = Request & {
		user: UserAP;
        Inertia: Inertia;
        flash: Flash<FlashMessages>;
		session: reqSession,
		_parsedUrl: {
			pathname: string
		}
		setLocale: (locale: string) => void
		route: {
			[key: string]: string
		}
		adminizer: Adminizer
		upload: (options?: { destination?: string; filename?: (file: Express.Multer.File) => string }) => multer.Multer
		i18n: I18n,
		allowedFileTypes: string[],
		uploadedFileType: string
	}

	type ResType = Response & {
		/**
		 * @deprecated // TODO delete after finish catalog
		 */
		viewAdmin(specifiedPath: string, locals?: any, cb_view?: Function): void
	}

	type MiddlewareType = (req: ReqType, res: ResType, next: NextFunction) => void
	type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];
}

export {};
