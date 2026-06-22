import {z} from 'zod';
import {
    Agent,
    AgentInputItem,
    run,
    tool,
    setDefaultOpenAIKey,
    RunContext,
} from '@openai/agents';
import {AbstractAiModelService} from '../../../dist/lib/ai-assistant/AbstractAiModelService';
import type {AiAssistantMessage, ModelResource} from '../../../dist/interfaces/types';
import type {ModelConfig} from '../../../dist/interfaces/adminpanelConfig';
import {Adminizer} from '../../../dist/lib/Adminizer';
import type {AppAiAssistantContext} from '../../../dist/lib/app-manager/AdminizerApp';
import type {DataAccessor} from '../../../dist/lib/DataAccessor';
import type {User} from '../../../dist/models/User';

interface AgentContext {
    user: User;
}

export class OpenAiDataAgentService extends AbstractAiModelService {
    private readonly apiKey?: string;
    private readonly model: string;

    constructor(private readonly context: AppAiAssistantContext) {
        super({
            id: 'openai-data',
            name: 'OpenAI data explorer',
            description: 'Answers questions with live data retrieved via Adminizer models.',
        });

        this.apiKey = process.env.OPENAI_API_KEY ?? process.env.ADMINIZER_OPENAI_KEY;
        this.model = process.env.OPENAI_AGENT_MODEL ?? 'gpt-5-nano';

        if (this.apiKey) {
            setDefaultOpenAIKey(this.apiKey);
        } else {
            Adminizer.log.warn('[OpenAiDataAgentService] OPENAI_API_KEY is not configured; the agent will remain inactive.');
        }
    }

    public isEnabled(): boolean {
        return Boolean(this.apiKey);
    }

    public async generateReply(
        prompt: string,
        history: AiAssistantMessage[],
        user: User,
    ): Promise<string> {
        if (!this.isEnabled()) {
            return 'The OpenAI data agent is not configured. Please set the OPENAI_API_KEY environment variable.';
        }

        try {
            console.log('\n🤖 [Agent Debug] Starting agent execution');
            console.log('📝 [Agent Debug] User prompt:', prompt);
            console.log('📚 [Agent Debug] History length:', history.length);
            
            const agent = this.createAgent(user);
            const conversation = this.toAgentInput(history);
            
            console.log('🚀 [Agent Debug] Running agent with maxTurns: 6');
            const result = await run(agent, conversation.length > 0 ? conversation : prompt, {
                context: {user},
                maxTurns: 6,
            });

            console.log('✅ [Agent Debug] Agent execution completed');
            console.log('💬 [Agent Debug] Final output type:', typeof result.finalOutput);
            console.log('📤 [Agent Debug] Final output:', result.finalOutput);

            return typeof result.finalOutput === 'string'
                ? result.finalOutput
                : 'The agent finished without returning a message.';
        } catch (error) {
            console.error('❌ [Agent Debug] Agent execution failed:', error);
            Adminizer.log.error('[OpenAiDataAgentService] Failed to generate reply', error);
            return 'I encountered an error while generating a response. Please try again later.';
        }
    }

    private createAgent(user: User): Agent<AgentContext> {
        const accessibleModels = this.listReadableModels(user);
        const modelSummary = accessibleModels.length > 0
            ? accessibleModels.map(({name, config}) => `• ${name} (model key: ${config.model})`).join('\n')
            : 'No models are currently accessible.';

        const dataQueryTool = tool({
            name: 'query_model_records',
            description: 'Query Adminizer models using DataAccessor. Provide the model name from the admin panel configuration.',
            parameters: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration',
                        minLength: 1
                    },
                    filter: {
                        type: 'string',
                        description: 'Optional filter as a JSON string matching the model criteria',
                        default: ''
                    },
                    fields: {
                        type: 'array',
                        items: {type: 'string', minLength: 1},
                        description: 'Optional list of fields to include in the response',
                        default: []
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        description: 'Maximum number of records to return (default 10).',
                        default: 10
                    }
                },
                required: ['model', 'filter', 'fields', 'limit'],
                additionalProperties: false
            },
            execute: async (input: any, runContext?: RunContext<AgentContext>) => {
                console.log('\n🔍 [Tool: query_model_records] Executing...');
                console.log('📋 [Tool] Input:', JSON.stringify(input, null, 2));
                
                const activeUser = runContext?.context?.user ?? user;
                console.log('👤 [Tool] Active user:', activeUser.login);
                
                if (!input.model) {
                    throw new Error('Model name is required');
                }
                
                const entity = this.resolveEntity(input.model);
                console.log('📊 [Tool] Resolved entity:', entity.name);
                
                if (!entity.model) {
                    throw new Error(`Model "${input.model}" is not registered in Adminizer.`);
                }

                const accessor = this.context.createDataAccessor(entity, activeUser, 'list');
                let criteria = {};
                
                // Handle filter parameter - can be empty string (default), undefined, or actual filter
                const filterValue = input.filter;
                if (filterValue && filterValue.trim() && filterValue !== '') {
                    try {
                        criteria = JSON.parse(filterValue);
                        console.log('🔎 [Tool] Filter criteria:', JSON.stringify(criteria, null, 2));
                    } catch (e) {
                        throw new Error('Invalid filter JSON');
                    }
                } else {
                    console.log('🔎 [Tool] No filter applied (fetching all records)');
                }
                
                const records = await entity.model.find(criteria, accessor);
                console.log('📦 [Tool] Found records:', records.length);
                
                const limitValue = input.limit && input.limit > 0 ? input.limit : 10;
                const limited = records.slice(0, limitValue);
                console.log('✂️  [Tool] Limited to:', limited.length, 'records');
                
                // Handle fields parameter - can be empty array (default), undefined, or actual fields
                const fieldsValue = input.fields;
                const projected = fieldsValue && Array.isArray(fieldsValue) && fieldsValue.length > 0
                    ? limited.map((record: Record<string, unknown>) => this.pickFields(record, fieldsValue))
                    : limited;
                
                if (fieldsValue && fieldsValue.length > 0) {
                    console.log('🎯 [Tool] Projected fields:', fieldsValue.join(', '));
                } else {
                    console.log('🎯 [Tool] Returning all fields');
                }

                const result = JSON.stringify({
                    model: entity.name,
                    count: projected.length,
                    records: projected,
                }, null, 2);
                
                console.log('✅ [Tool: query_model_records] Completed successfully');
                return result;
            },
        });

        const createRecordTool = tool({
            name: 'create_model_record',
            description: 'Create new Adminizer records using DataAccessor with the caller\'s permissions.',
            parameters: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration.',
                        minLength: 1,
                    },
                    payload: {
                        type: 'string',
                        description: 'Record fields as a JSON string containing the field values for the new record.',
                    },
                },
                required: ['model', 'payload'],
                additionalProperties: false,
            },
            execute: async (input: any, runContext?: RunContext<AgentContext>) => {
                console.log('\n✏️  [Tool: create_model_record] Executing...');
                console.log('📋 [Tool] Input:', JSON.stringify(input, null, 2));
                
                const activeUser = runContext?.context?.user ?? user;
                console.log('👤 [Tool] Active user:', activeUser.login);

                if (!input.model) {
                    throw new Error('Model name is required');
                }

                const entity = this.resolveEntity(input.model);
                console.log('📊 [Tool] Resolved entity:', entity.name);
                
                if (!entity.model) {
                    throw new Error(`Model "${input.model}" is not registered in Adminizer.`);
                }

                const accessor = this.context.createDataAccessor(entity, activeUser, 'add');
                console.log('🔐 [Tool] Preparing create payload with permission checks...');
                const sanitizedPayload = await this.prepareCreatePayload(input.payload, accessor);
                console.log('✅ [Tool] Sanitized payload:', JSON.stringify(sanitizedPayload, null, 2));

                console.log('💾 [Tool] Creating record in database...');
                const created = await entity.model.create(sanitizedPayload, accessor);
                console.log('✅ [Tool] Record created with ID:', (created as any).id);

                return JSON.stringify({
                    model: entity.name,
                    action: 'create',
                    record: created,
                }, null, 2);
            },
        });

        const updateRecordTool = tool({
            name: 'update_model_record',
            description: 'Update existing Adminizer records using DataAccessor with the caller\'s permissions.',
            parameters: {
                type: 'object',
                properties: {
                    model: {
                        type: 'string',
                        description: 'Model name as defined in the Adminizer configuration.',
                        minLength: 1,
                    },
                    recordId: {
                        type: 'string',
                        description: 'ID of the record to update.',
                        minLength: 1,
                    },
                    payload: {
                        type: 'string',
                        description: 'Record fields as a JSON string containing only the fields to update.',
                    },
                },
                required: ['model', 'recordId', 'payload'],
                additionalProperties: false,
            },
            execute: async (input: any, runContext?: RunContext<AgentContext>) => {
                console.log('\n🔄 [Tool: update_model_record] Executing...');
                console.log('📋 [Tool] Input:', JSON.stringify(input, null, 2));
                
                const activeUser = runContext?.context?.user ?? user;
                console.log('👤 [Tool] Active user:', activeUser.login);

                if (!input.model) {
                    throw new Error('Model name is required');
                }

                if (!input.recordId) {
                    throw new Error('Record ID is required for update');
                }

                const entity = this.resolveEntity(input.model);
                console.log('📊 [Tool] Resolved entity:', entity.name);
                
                if (!entity.model) {
                    throw new Error(`Model "${input.model}" is not registered in Adminizer.`);
                }

                const accessor = this.context.createDataAccessor(entity, activeUser, 'edit');
                console.log('🔐 [Tool] Preparing update payload with permission checks...');
                const sanitizedPayload = await this.prepareUpdatePayload(input.payload, accessor);
                console.log('✅ [Tool] Sanitized payload:', JSON.stringify(sanitizedPayload, null, 2));

                console.log('💾 [Tool] Updating record ID:', input.recordId);
                // Determine the primary key field name (usually 'id')
                const pkField = entity.model.primaryKey || 'id';
                const criteria: Record<string, any> = {[pkField]: input.recordId};
                
                const updated = await entity.model.update(criteria, sanitizedPayload, accessor);
                console.log('✅ [Tool] Record updated successfully');

                return JSON.stringify({
                    model: entity.name,
                    action: 'update',
                    recordId: input.recordId,
                    record: updated[0] || updated,
                }, null, 2);
            },
        });

        return new Agent<AgentContext>({
            name: 'Adminizer data agent',
            instructions: [
                'You are an assistant that answers questions using Adminizer data.',
                'Always rely on the provided tools to inspect or modify database records.',
                'Prefer concise JSON outputs for tool calls and provide human-readable summaries afterwards.',
                'Only include fields that are relevant to the request and double-check required values before creating records.',
                'When updating records, first use query_model_records to find the record and its ID, then use update_model_record with that ID.',
                'For updates, you only need to provide the fields that should be changed (partial updates are supported).',
                'Summaries should explain how the answer was derived from the data or confirm the performed mutation.',
                '',
                'Accessible models:',
                modelSummary,
            ].join('\n'),
            handoffDescription: 'Retrieves Adminizer records using DataAccessor with full permission checks.',
            tools: [dataQueryTool, createRecordTool, updateRecordTool],
            model: this.model,
        });
    }

    private pickFields<T extends Record<string, unknown>>(record: T, fields: string[]): Partial<T> {
        return fields.reduce<Partial<T>>((acc, field) => {
            if (field in record) {
                acc[field as keyof T] = record[field] as T[keyof T];
            }
            return acc;
        }, {});
    }

    private async prepareCreatePayload(
        rawPayload: unknown,
        accessor: DataAccessor,
    ): Promise<Record<string, unknown>> {
        const parsedPayload = this.normalizePayload(rawPayload);
        const fieldsConfig = accessor.getFieldsConfig();

        if (!fieldsConfig) {
            throw new Error('You do not have permission to create records for this model.');
        }

        const allowedKeys = Object.keys(fieldsConfig);
        const sanitized: Record<string, unknown> = {};

        for (const key of allowedKeys) {
            if (Object.prototype.hasOwnProperty.call(parsedPayload, key)) {
                sanitized[key] = parsedPayload[key];
            }
        }

        const missingRequired = Object.entries(fieldsConfig)
            .filter(([_, config]) => {
                // Handle different config types - config can be boolean, string, or object
                if (typeof config === 'object' && config !== null && 'config' in config) {
                    const fieldConfig = config.config as any;
                    return Boolean(fieldConfig?.required);
                } else if (typeof config === 'object' && config !== null && 'required' in config) {
                    // Direct BaseFieldConfig object
                    return Boolean((config as any).required);
                }
                return false;
            })
            .map(([key]) => key)
            .filter((key) => {
                const value = sanitized[key];
                return value === undefined || value === null || value === '';
            });

        if (missingRequired.length > 0) {
            throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
        }

        return sanitized;
    }

    private async prepareUpdatePayload(
        rawPayload: unknown,
        accessor: DataAccessor,
    ): Promise<Record<string, unknown>> {
        const parsedPayload = this.normalizePayload(rawPayload);
        const fieldsConfig = accessor.getFieldsConfig();

        if (!fieldsConfig) {
            throw new Error('You do not have permission to update records for this model.');
        }

        const allowedKeys = Object.keys(fieldsConfig);
        const sanitized: Record<string, unknown> = {};

        // For updates, only include fields that are present in the payload
        // No required field validation needed for updates (partial updates are allowed)
        for (const key of allowedKeys) {
            if (Object.prototype.hasOwnProperty.call(parsedPayload, key)) {
                sanitized[key] = parsedPayload[key];
            }
        }

        if (Object.keys(sanitized).length === 0) {
            throw new Error('No valid fields provided for update');
        }

        return sanitized;
    }

    private normalizePayload(rawPayload: unknown): Record<string, unknown> {
        if (typeof rawPayload === 'string') {
            try {
                const parsed = JSON.parse(rawPayload);
                return this.ensureRecord(parsed);
            } catch {
                throw new Error('Payload must be a valid JSON object string.');
            }
        }

        return this.ensureRecord(rawPayload);
    }

    private ensureRecord(value: unknown): Record<string, unknown> {
        const schema = z.record(z.string(), z.any());
        const parsed = schema.safeParse(value);

        if (!parsed.success || Array.isArray(parsed.data)) {
            throw new Error('Payload must be an object with field values.');
        }

        return parsed.data;
    }

    private toAgentInput(history: AiAssistantMessage[]): AgentInputItem[] {
        return history.map<AgentInputItem>((message) => {
            if (message.role === 'user') {
                return {
                    type: 'message',
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: message.content,
                        },
                    ],
                };
            }

            return {
                type: 'message',
                role: 'assistant',
                status: 'completed',
                content: [
                    {
                        type: 'output_text',
                        text: message.content,
                    },
                ],
            };
        });
    }

    private listReadableModels(user: User): Array<{name: string; config: ModelConfig}> {
        const readable: Array<{name: string; config: ModelConfig}> = [];

        for (const resource of this.context.getModelResources()) {
            if (!resource.model) {
                continue;
            }

            const token = `read-${resource.model.modelname}-model`;
            if (this.context.hasPermission(token, user)) {
                readable.push({name: resource.name, config: resource.config});
            }
        }

        return readable;
    }

    private resolveEntity(modelName: string): ModelResource {
        const resource = this.context.resolveModelResource(modelName.trim());
        if (!resource) {
            throw new Error(`Unknown model "${modelName}".`);
        }

        if (!resource.model) {
            throw new Error(`Model adapter is not initialized for "${resource.config.model}".`);
        }

        return resource;
    }
}
