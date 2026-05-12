import {AbstractAiModelService} from './AbstractAiModelService';
import {AiAssistantMessage} from '../../interfaces/types';
import {UserAP} from '../../models/UserAP';
import {Adminizer} from '../Adminizer';
import {ActionType, ModelConfig} from '../../interfaces/adminpanelConfig';
import {Entity} from '../../interfaces/types';
import {DataAccessor} from '../DataAccessor';

type AgentAction = 'create' | 'list' | 'update' | 'delete';

interface AgentInstruction {
    action: AgentAction;
    entity: string;
    payload?: Record<string, unknown>;
    criteria?: Record<string, unknown>;
}

type DataAccessorFactory = (entity: Entity, user: UserAP, action: ActionType) => DataAccessor;

const ACTION_TOKENS: Record<ActionType, 'create' | 'read' | 'update' | 'delete'> = {
    add: 'create',
    edit: 'update',
    list: 'read',
    view: 'read',
    remove: 'delete',
};

export class OpenAiModelService extends AbstractAiModelService {
    private readonly createAccessor: DataAccessorFactory;

    public constructor(adminizer: Adminizer, accessorFactory?: DataAccessorFactory) {
        super(adminizer, {
            id: 'openai',
            name: 'OpenAI fixture agent',
            description: 'Executes structured commands with DataAccessor using the current user permissions.',
        });
        this.createAccessor = accessorFactory ?? ((entity, user, action) => new DataAccessor(adminizer, user, entity, action));
    }

    public async generateReply(prompt: string, _history: AiAssistantMessage[], user: UserAP): Promise<string> {
        const instruction = this.parseInstruction(prompt);

        if (!instruction) {
            return this.usageMessage();
        }

        switch (instruction.action) {
            case 'create':
                return this.handleCreate(instruction, user);
            default:
                return `Unsupported action "${instruction.action}". The OpenAI agent currently supports only the "create" action.`;
        }
    }

    private async handleCreate(instruction: AgentInstruction, user: UserAP): Promise<string> {
        const entity = this.resolveEntity(instruction.entity);
        if (!entity || !entity.model) {
            return `Model "${instruction.entity}" is not available in this project.`;
        }

        if (!this.userHasPermission(entity, user, 'add')) {
            return `User "${user.login}" does not have permission to create ${entity.name} records.`;
        }

        if (!instruction.payload || typeof instruction.payload !== 'object') {
            return 'The "create" action requires a "data" object with field values.';
        }

        try {
            const accessor = this.createAccessor(entity, user, 'add');
            const created = await entity.model.create(instruction.payload as any, accessor);
            const preview = JSON.stringify(created, null, 2);
            const recordId = this.extractPrimaryKey(created, entity);
            const idMessage = recordId !== undefined ? ` (id: ${recordId})` : '';
            return `Record created in ${entity.name}${idMessage}:\n${preview}`;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Adminizer.log.error('OpenAI agent failed to create record', error);
            return `Failed to create ${entity.name} record: ${message}`;
        }
    }

    private parseInstruction(prompt: string): AgentInstruction | null {
        try {
            const parsed = JSON.parse(prompt);
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }

            const rawAction = this.extractString(parsed, ['action', 'type']);
            if (!rawAction) {
                return null;
            }

            const action = rawAction.toLowerCase();
            if (!['create', 'list', 'update', 'delete'].includes(action)) {
                return null;
            }

            const entity = this.extractString(parsed, ['entity', 'model']);
            if (!entity) {
                return null;
            }

            const payload = this.extractObject(parsed, ['data', 'payload', 'record']);
            const criteria = this.extractObject(parsed, ['criteria', 'where', 'filter']);

            return {
                action: action as AgentAction,
                entity,
                payload,
                criteria,
            };
        } catch {
            return null;
        }
    }

    private usageMessage(): string {
        return [
            'Provide JSON instructions so the OpenAI agent can execute them with your permissions.',
            'Example:',
            '```json',
            '{',
            '  "action": "create",',
            '  "entity": "Example",',
            '  "data": { "title": "Hello from the agent" }',
            '}',
            '```',
            'The agent uses DataAccessor, so any field-level restrictions from your account are respected.',
        ].join('\n');
    }

    private resolveEntity(modelName: string): Entity | null {
        const models = this.adminizer.config.models;
        if (!models) {
            return null;
        }

        const loweredName = modelName.toLowerCase();
        const match = Object.entries(models).find(([key, config]) => {
            if (key.toLowerCase() === loweredName) {
                return true;
            }
            if (typeof config === 'object' && config && 'model' in config && typeof config.model === 'string') {
                return config.model.toLowerCase() === loweredName;
            }
            return false;
        });

        if (!match) {
            return null;
        }

        const [configName, configValue] = match as [string, ModelConfig | boolean];
        const normalizedConfig = this.normalizeModelConfig(configName, configValue);
        const model = this.adminizer.modelHandler.model.get(normalizedConfig.model);

        if (!model) {
            return null;
        }

        return {
            name: configName,
            uri: `${this.adminizer.config.routePrefix}/model/${configName}`,
            config: normalizedConfig,
            model,
        };
    }

    private normalizeModelConfig(name: string, config: ModelConfig | boolean): ModelConfig {
        const baseConfig: ModelConfig = {
            model: name,
            icon: 'description',
            title: name,
            list: true,
            add: true,
            edit: true,
            remove: true,
            view: true,
        } as ModelConfig;

        if (typeof config === 'boolean') {
            return config ? baseConfig : {...baseConfig, list: false, add: false, edit: false, remove: false, view: false};
        }

        return {...baseConfig, ...config};
    }

    private userHasPermission(entity: Entity, user: UserAP, action: ActionType): boolean {
        const token = this.getPermissionToken(entity, action);
        return this.adminizer.accessRightsHelper.hasPermission(token, user);
    }

    private getPermissionToken(entity: Entity, action: ActionType): string {
        const verb = ACTION_TOKENS[action];
        const modelName = entity.model?.modelname ?? entity.config?.model ?? entity.name;
        return `${verb}-${modelName}-model`.toLowerCase();
    }

    private extractPrimaryKey(record: Partial<Record<string, unknown>>, entity: Entity): unknown {
        if (!record) {
            return undefined;
        }
        const primaryKey = (entity.model as any)?.primaryKey ?? 'id';
        return (record as Record<string, unknown>)[primaryKey];
    }

    private extractString(source: any, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = source?.[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }
        return undefined;
    }

    private extractObject(source: any, keys: string[]): Record<string, unknown> | undefined {
        for (const key of keys) {
            const value = source?.[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value as Record<string, unknown>;
            }
        }
        return undefined;
    }
}
