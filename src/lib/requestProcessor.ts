import { isObject } from "../helpers/JsUtils";
import {Fields} from "../helpers/fieldsHelper";
import {Adminizer} from "./Adminizer";

type PostParams = Record<string, string | number | boolean | object | string[] | number[] | null>;

/**
 * Default helper that will contain all methods
 * that should help with processing request details and bind
 *
 * @type {*}
 */
export class RequestProcessor {
    /**
     * Will try to find all fields that should be used in model
     *
     * @param {Request} req
     * @param {Object} fields
     * @param {Function=} [cb]
     * @see ControllerHelper#getFields to know what data should be passed into fields
     * @returns {Object} List of processed values from request
     */

    public static processRequest(req: ReqType, fields: Fields): PostParams {
        const data = {
            ...req.params,
            ...req.query,
            ...req.body,
        };
        let postParams: PostParams = {};
        for (let key of Object.keys(data)) {
            if (fields[key]) {
                postParams[key] = data[key];
            }
        }

        for (let key in postParams) {
            let field = fields[key];
            
            // if (field.model.type === 'boolean') {
            //     postParams[key] = ['true', '1', 'yes', "TRUE", "on"].includes(postParams[key].toString().toLowerCase());
            //     continue;
            // }

            if (field.model.type === 'number') {
                if(isObject(field.config) && field.config.type === "boolean" && typeof postParams[key] === "boolean") {
                    postParams[key] = postParams[key] ? 1 : 0
                }
                postParams[key] = parseFloat(postParams[key] as string);
            }

            if (field.model.type === 'json') {
                try {
                    postParams[key] = JSON.parse(postParams[key] as string);
                } catch (error) {
                    if (typeof postParams[key] === "string" && (postParams[key] as string).trim()) {
                        Adminizer.log.error(`Adminpanel > processRequest: json parse error when parsing ${postParams[key]}`, error);
                    }
                }
            }
        }

        return postParams;
    }
}
