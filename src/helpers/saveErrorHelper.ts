import { Fields } from "./fieldsHelper";

/**
 * Error codes/names that different ORM layers use for a unique constraint violation.
 * Waterline reports `E_UNIQUE`, Sequelize throws `SequelizeUniqueConstraintError`,
 * a raw PostgreSQL/MySQL driver surfaces the native SQLSTATE.
 */
const UNIQUE_VIOLATION_CODES = [
    'E_UNIQUE',
    'SequelizeUniqueConstraintError',
    '23505',
    'ER_DUP_ENTRY'
];

export interface DescribedSaveError {
    /** Human readable message for the flash/toast */
    message: string;
    /** Per field messages, keyed by field name, in the shape Inertia expects in `props.errors` */
    fieldErrors?: Record<string, string>;
}

/**
 * Walks the `cause` chain and returns the first defined value of `key`.
 * ORM adapters tend to re-wrap the original error, so the useful metadata
 * (`code`, `attrNames`) can sit one or two levels deep.
 */
function fromErrorChain(e: unknown, key: string): any {
    let current: any = e;
    for (let depth = 0; current && depth < 5; depth++) {
        if (current[key] !== undefined) return current[key];
        current = current.cause;
    }
    return undefined;
}

/**
 * Collects the names of the attributes that caused a unique constraint violation.
 */
function getConflictingAttributes(e: unknown): string[] {
    const attrNames = fromErrorChain(e, 'attrNames');
    if (Array.isArray(attrNames) && attrNames.length) return attrNames;

    // Sequelize keeps them in `errors[].path`
    const errors = fromErrorChain(e, 'errors');
    if (Array.isArray(errors)) {
        const paths = errors.map((item: any) => item?.path).filter(Boolean);
        if (paths.length) return paths;
    }

    return [];
}

/**
 * Turns an error thrown by the model layer into something that can be shown to the user.
 *
 * A unique constraint violation is a user mistake, not a server failure: it has to come back
 * as a filled form with the offending field marked, so we map it to per field messages.
 * Anything else falls back to the raw error message.
 *
 * @param e error thrown by `model.create()` / `model.update()`
 * @param fields fields config of the current model, used to resolve human readable field titles;
 *        may be omitted for models that have no fields config (users, groups)
 * @param req request, used for translations
 */
export function describeSaveError(e: any, fields: Fields | undefined, req: ReqType): DescribedSaveError {
    const code = fromErrorChain(e, 'code') ?? fromErrorChain(e, 'name');
    const attrNames = getConflictingAttributes(e);

    if (UNIQUE_VIOLATION_CODES.includes(code) && attrNames.length) {
        const takenMessage = req.i18n.__('This value is already taken');
        const fieldErrors: Record<string, string> = {};
        const titles = attrNames.map((attr) => {
            fieldErrors[attr] = takenMessage;
            return fields?.[attr]?.config?.title ?? attr;
        });

        return {
            message: `${takenMessage}: ${titles.join(', ')}`,
            fieldErrors
        };
    }

    return {
        message: e?.message || req.i18n.__('Something went wrong...')
    };
}
