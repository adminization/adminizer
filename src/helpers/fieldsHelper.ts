import { ActionType, BaseFieldConfig, FieldsTypes, ModelConfig } from "../interfaces/adminpanelConfig";
import { ModelResource } from "../interfaces/types";
import { Attribute, ModelAnyInstance } from "../lib/model/AbstractModel";
import { DataAccessor } from "../lib/DataAccessor";
import { Adminizer } from "../lib/Adminizer";
export type Field = {
	config: BaseFieldConfig & {
		/** @deprecated record should not be in config anymore */
		records?: Record<string, any>[]
		file?: string
		key?: string
		required?: boolean
		type?: FieldsTypes
		groupsAccessRights?: string[]
	}
	/** For render associalitons fields */
	populated: {
		[key: string]: Field
	} | undefined
	model: Attribute
	modelConfig: ModelConfig
}

export type Fields = {
	[key: string]: Field;
};

export class FieldsHelper {
	/**
	 * Load list of records for all associations into `fields`
	 *
	 * @param req
	 * @param {Object} fields
	 * @param user
	 * @param action
	 * @deprecated this method has overload association tree on each request that is not optimize
	 */
	// TODO: make separate request for all dropdown relations by api call
	public static async loadAssociations(req: ReqType, fields: Fields, action?: ActionType): Promise<Fields> {
		/**
		 * Load all associated records for given field key
		 *
		 * @param {string} key
		 * @param user
		 * @param action
		 */
		let loadAssoc = async function (key: string, action?: ActionType) {
			let fieldConfigConfig = fields[key].config;
			if (fieldConfigConfig.type !== 'association' && fieldConfigConfig.type !== 'association-many') {
				return;
			}
			fieldConfigConfig.records = [];

			let modelName = fields[key].model.model || fields[key].model.collection;

			if (!modelName) {
				Adminizer.log.error('No model found for field: ', fields[key]);
				return;
			}

			const resolvedModelName = req.adminizer.modelHandler.resolveAssociationResource(
				modelName,
				fields[key].model.resourceName
			);
			let Model = resolvedModelName ? req.adminizer.modelHandler.getResource(resolvedModelName) : undefined;
			if (!Model || !resolvedModelName) {
				return;
			}

			let list: ModelAnyInstance[];
			try {
				// adding deprecated records array to config for association widget
				Adminizer.log.warn("Warning: executing malicious job trying to add a huge amount of records in field config," +
					" please rewrite this part of code in the nearest future");
				let modelResource: ModelResource = {
					name: resolvedModelName,
					config: req.adminizer.config.models[resolvedModelName] as ModelConfig,
					model: Model,
					uri: `${req.adminizer.config.routePrefix}/model/${resolvedModelName}`
				};
				let dataAccessor = new DataAccessor(req.adminizer, req.user, modelResource, "view");
				list = await Model.find({}, dataAccessor);
			} catch (e) {
				Adminizer.log.error(e)
				throw new Error("FieldsHelper > loadAssociations error");
			}

			fieldConfigConfig.records = list;
		};

		for await (let key of Object.keys(fields)) {
			try {
				await loadAssoc(key, action);
			} catch (e) {
				Adminizer.log.error(e);
				return e;
			}
		}

		return fields
	}
}


