import type {MenuItem} from '../../helpers/menuHelper';
import {listModelResources, resolveModelResource} from '../../helpers/modelResourceHelper';
import {listAccessibleMenuItems} from '../../helpers/navigationAccessHelper';
import type {HrefConfig} from '../../interfaces/adminpanelConfig';
import type {ModelResource} from '../../interfaces/types';
import type {User} from '../../models/User';
import type {Adminizer} from '../Adminizer';
import {DataAccessor} from '../DataAccessor';
import type {AiAssistantAgentSkill} from './AiAssistantAgentSkillHandler';
import {toJsonSafe} from './jsonSafe';

const MAX_RECORDS = 50;
const DEFAULT_RECORDS = 10;

type ModelPermissions = {
    resource: ModelResource;
    canRead: boolean | Promise<boolean>;
    canUpdate: boolean | Promise<boolean>;
    canCreate: boolean | Promise<boolean>;
};

/** What the current user may do with every configured model resource. */
function listPermittedModels(adminizer: Adminizer, user: User): ModelPermissions[] {
    const has = (token: string) => adminizer.accessRightsHelper.hasPermission(token, user);
    return listModelResources(adminizer)
        .map((resource) => ({
            resource,
            canRead: has(`read-${resource.name}-model`),
            canUpdate: has(`update-${resource.name}-model`),
            canCreate: has(`create-${resource.name}-model`),
        }))
        .filter((entry) => entry.canRead || entry.canUpdate);
}

/**
 * Resolves a model this user may use for `action`. Nothing outside the user's
 * own permissions is reachable, which is what makes these skills safe to hand
 * to non-administrator accounts.
 */
function requireModel(adminizer: Adminizer, user: User, name: string, action: 'read' | 'update'): ModelResource {
    const resource = resolveModelResource(adminizer, name);
    if (!resource?.model) throw new Error(`Model "${name}" is not available.`);
    const token = action === 'read' ? `read-${resource.name}-model` : `update-${resource.name}-model`;
    if (!adminizer.accessRightsHelper.hasPermission(token, user)) {
        throw new Error(`You are not allowed to ${action} the "${resource.name}" model.`);
    }
    return resource;
}

function modelNames(adminizer: Adminizer, user: User, action: 'read' | 'update'): string[] {
    return listPermittedModels(adminizer, user)
        .filter((entry) => (action === 'read' ? entry.canRead : entry.canUpdate))
        .map((entry) => entry.resource.name);
}

/** Adds an `enum` of permitted models, so the agent cannot invent a model name. */
function withModelEnum(schema: Record<string, unknown>, models: string[]): Record<string, unknown> {
    const properties = {...(schema.properties as Record<string, any>)};
    properties.model = {...properties.model, enum: models};
    return {...schema, properties};
}

function identifierField(adminizer: Adminizer, resource: ModelResource): string {
    return resource.config?.identifierField
        ?? adminizer.config.identifierField
        ?? resource.model?.primaryKey
        ?? 'id';
}

function parseCriteria(filter: unknown): Record<string, unknown> {
    if (filter === undefined || filter === null || filter === '') return {};
    if (typeof filter === 'object') return filter as Record<string, unknown>;
    try {
        const parsed = JSON.parse(String(filter));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
        return parsed as Record<string, unknown>;
    } catch {
        throw new Error('filter must be a JSON object, e.g. {"title": "example"}');
    }
}

function pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
    return Object.fromEntries(fields.filter((field) => field in record).map((field) => [field, record[field]]));
}

function slugify(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
}

/** A navigation entry as the agent sees it: the sub-actions of a menu item. */
function describeNavigationActions(actions: HrefConfig[] | null | undefined): unknown[] {
    return (actions ?? []).map((action) => ({
        id: action.id || action.title,
        title: action.title,
        link: action.link,
        icon: action.icon || undefined,
        target: action.type === 'blank' ? 'blank' : undefined,
        actions: action.subItems?.length ? describeNavigationActions(action.subItems) : undefined,
    }));
}

function describeNavigationItem(item: MenuItem): Record<string, unknown> {
    return {
        id: item.id,
        title: item.title,
        link: item.link,
        icon: item.icon || undefined,
        target: item.type === 'blank' ? 'blank' : undefined,
        model: item.modelResourceName || undefined,
        actions: item.actions?.length ? describeNavigationActions(item.actions) : undefined,
    };
}

/** Field names of a model resource that this user may see or write. */
function fieldNames(adminizer: Adminizer, user: User, resource: ModelResource, action: 'list' | 'edit'): string[] {
    return Object.keys(new DataAccessor(adminizer, user, resource, action).getFieldsConfig());
}

/**
 * Skills every agent gets for free: who it is talking to, and read/edit access
 * scoped to exactly the data that user may reach in the admin panel. Because
 * every call re-checks the user's permissions, an agent built on them can be
 * offered to non-administrator accounts as well.
 */
export function buildBuiltinAgentSkills(adminizer: Adminizer): AiAssistantAgentSkill[] {
    const currentUser: AiAssistantAgentSkill = {
        id: 'current_user',
        description: 'Get the admin user this conversation belongs to: login, name, email, locale, groups and administrator flag.',
        inputSchema: {type: 'object', properties: {}, additionalProperties: false},
        execute: (_input, {userIdentity}) => userIdentity,
    };

    const listModels: AiAssistantAgentSkill = {
        id: 'list_data_models',
        description: 'List the data models the current user may read or edit, with their fields, allowed operations and admin URLs.',
        inputSchema: {type: 'object', properties: {}, additionalProperties: false},
        execute: (_input, {user}) => ({
            models: listPermittedModels(adminizer, user).map(({resource, canRead, canUpdate, canCreate}) => ({
                name: resource.name,
                title: resource.config?.title ?? resource.name,
                canRead,
                canUpdate,
                canCreate,
                identifierField: identifierField(adminizer, resource),
                listUrl: resource.uri,
                recordUrlTemplate: canUpdate ? `${resource.uri}/edit/:id` : undefined,
                fields: fieldNames(adminizer, user, resource, canUpdate ? 'edit' : 'list'),
            })),
        }),
    };

    const listNavigation: AiAssistantAgentSkill = {
        id: 'list_admin_navigation',
        description: 'Show the admin panel navigation menu of the current user: sections, their links with sub-actions,'
            + ' and the templates of parametrized pages such as a single record. Only entries this user may open are returned.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Optional words to filter menu items by title, section or path. Omit to get the whole menu.',
                },
            },
            additionalProperties: false,
        },
        execute: (input, {user}) => {
            const needle = slugify(input.query);
            const matches = (...values: Array<string | undefined>): boolean =>
                !needle || slugify(values.filter(Boolean).join(' ')).includes(needle);

            const sections = new Map<string, Record<string, unknown>[]>();
            for (const item of listAccessibleMenuItems(adminizer, user)) {
                if (!matches(item.title, item.id, item.section, item.link, item.modelResourceName)) continue;
                const section = item.section || 'Platform';
                if (!sections.has(section)) sections.set(section, []);
                sections.get(section)!.push(describeNavigationItem(item));
            }

            return {
                sections: [...sections].map(([section, items]) => ({section, items})),
                // Record and other parametrized pages have no fixed URL, so the
                // agent gets them as templates to fill in.
                templates: adminizer.adminLinkHandler.listTemplates(user)
                    .filter((template) => matches(template.title, template.id, template.section, template.description, template.template))
                    .map((template) => ({
                        id: template.id,
                        title: template.title,
                        template: template.template,
                        description: template.description,
                        section: template.section,
                        params: template.params,
                    })),
            };
        },
    };

    const readRecords: AiAssistantAgentSkill = {
        id: 'read_model_records',
        description: 'Read records of a data model the current user may read.',
        inputSchema: {
            type: 'object',
            properties: {
                model: {type: 'string', description: 'Model name as returned by list_data_models.'},
                filter: {type: 'string', description: 'Optional JSON criteria object, e.g. {"title": "example"}.'},
                fields: {type: 'array', items: {type: 'string'}, description: 'Optional subset of fields to return.'},
                limit: {
                    type: 'integer', minimum: 1, maximum: MAX_RECORDS,
                    description: `Maximum number of records to return (default ${DEFAULT_RECORDS}).`,
                },
            },
            required: ['model'],
            additionalProperties: false,
        },
        requiresUser: true,
        describe: (user) => {
            const models = modelNames(adminizer, user, 'read');
            return {
                description: `Read records of a data model the current user may read. Readable models: ${models.join(', ') || 'none'}.`,
                inputSchema: withModelEnum(readRecords.inputSchema, models),
            };
        },
        execute: async (input, {user}) => {
            const resource = requireModel(adminizer, user, String(input.model ?? ''), 'read');
            const criteria = parseCriteria(input.filter);
            const limit = Math.min(Math.max(Math.trunc(Number(input.limit) || DEFAULT_RECORDS), 1), MAX_RECORDS);
            const fields = Array.isArray(input.fields) ? input.fields.map(String) : [];
            const accessor = new DataAccessor(adminizer, user, resource, 'list');
            const records = await resource.model!.find(criteria, accessor);
            const limited = records.slice(0, limit) as Array<Record<string, unknown>>;
            return toJsonSafe({
                model: resource.name,
                total: records.length,
                count: limited.length,
                records: fields.length ? limited.map((record) => pickFields(record, fields)) : limited,
            });
        },
    };

    const updateRecord: AiAssistantAgentSkill = {
        id: 'update_model_record',
        description: 'Update one record of a data model the current user may edit.',
        inputSchema: {
            type: 'object',
            properties: {
                model: {type: 'string', description: 'Model name as returned by list_data_models.'},
                id: {type: 'string', description: 'Identifier of the record to update.'},
                values: {
                    type: 'object',
                    description: 'Field values to write, e.g. {"title": "new title"}. Fields this user may not edit are dropped by the panel.',
                    additionalProperties: true,
                },
            },
            required: ['model', 'id', 'values'],
            additionalProperties: false,
        },
        requiresUser: true,
        describe: (user) => {
            const models = modelNames(adminizer, user, 'update');
            return {
                description: `Update one record of a data model the current user may edit. Editable models: ${models.join(', ') || 'none'}.`,
                inputSchema: withModelEnum(updateRecord.inputSchema, models),
            };
        },
        execute: async (input, {user}) => {
            const resource = requireModel(adminizer, user, String(input.model ?? ''), 'update');
            const id = String(input.id ?? '').trim();
            if (!id) throw new Error('id of the record to update is required');
            const values = input.values && typeof input.values === 'object' && !Array.isArray(input.values)
                ? input.values as Record<string, unknown>
                : null;
            if (!values || !Object.keys(values).length) throw new Error('values must be a non-empty object of field values');

            const accessor = new DataAccessor(adminizer, user, resource, 'edit');
            const record = await resource.model!.updateOne({[identifierField(adminizer, resource)]: id}, values, accessor);
            if (!record) throw new Error(`Record "${id}" was not found in "${resource.name}".`);
            return toJsonSafe({model: resource.name, id, record});
        },
    };

    return [currentUser, listNavigation, listModels, readRecords, updateRecord];
}
