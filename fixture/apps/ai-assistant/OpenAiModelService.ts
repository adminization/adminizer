import {Adminizer} from "../../../dist";
import {AbstractAiModelService} from "../../../dist/lib/ai-assistant/AbstractAiModelService";
import type {AppAiAssistantContext} from "../../../dist/lib/app-manager/AdminizerApp";
import type {ActionType} from "../../../dist/interfaces/adminpanelConfig";
import type {AiAssistantMessage, ModelResource} from "../../../dist/interfaces/types";
import type {DataAccessor} from "../../../dist/lib/DataAccessor";
import type {User} from "../../../dist/models/User";

type AgentAction = "create" | "list" | "update" | "delete";

interface AgentInstruction {
    action: AgentAction;
    modelResource: string;
    payload?: Record<string, unknown>;
    criteria?: Record<string, unknown>;
}

type DataAccessorFactory = (modelResource: ModelResource, user: User, action: ActionType) => DataAccessor;

const ACTION_TOKENS: Record<ActionType, "create" | "read" | "update" | "delete"> = {
    add: "create",
    edit: "update",
    list: "read",
    view: "read",
    remove: "delete",
};

export class OpenAiModelService extends AbstractAiModelService {
    private readonly createAccessor: DataAccessorFactory;

    constructor(
        private readonly context: AppAiAssistantContext,
        accessorFactory?: DataAccessorFactory,
    ) {
        super({
            id: "openai",
            name: "OpenAI fixture agent",
            description: "Executes structured commands with DataAccessor using the current user permissions.",
        });
        this.createAccessor = accessorFactory ?? context.createDataAccessor;
    }

    public async generateReply(prompt: string, _history: AiAssistantMessage[], user: User): Promise<string> {
        const instruction = this.parseInstruction(prompt);

        if (!instruction) {
            return this.usageMessage();
        }

        switch (instruction.action) {
            case "create":
                return this.handleCreate(instruction, user);
            default:
                return `Unsupported action "${instruction.action}". The OpenAI agent currently supports only the "create" action.`;
        }
    }

    private async handleCreate(instruction: AgentInstruction, user: User): Promise<string> {
        const modelResource = this.context.resolveModelResource(instruction.modelResource);
        if (!modelResource?.model) {
            return `Model "${instruction.modelResource}" is not available in this project.`;
        }

        if (!await this.userHasPermission(modelResource, user, "add")) {
            return `User "${user.login}" does not have permission to create ${modelResource.name} records.`;
        }

        if (!instruction.payload || typeof instruction.payload !== "object") {
            return 'The "create" action requires a "data" object with field values.';
        }

        try {
            const accessor = this.createAccessor(modelResource, user, "add");
            const created = await modelResource.model.create(instruction.payload as any, accessor);
            const preview = JSON.stringify(created, null, 2);
            const recordId = this.extractPrimaryKey(created, modelResource);
            const idMessage = recordId !== undefined ? ` (id: ${recordId})` : "";
            return `Record created in ${modelResource.name}${idMessage}:\n${preview}`;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            Adminizer.log.error("OpenAI agent failed to create record", error);
            return `Failed to create ${modelResource.name} record: ${message}`;
        }
    }

    private parseInstruction(prompt: string): AgentInstruction | null {
        try {
            const parsed = JSON.parse(prompt);
            if (!parsed || typeof parsed !== "object") {
                return null;
            }

            const rawAction = this.extractString(parsed, ["action", "type"]);
            if (!rawAction) {
                return null;
            }

            const action = rawAction.toLowerCase();
            if (!["create", "list", "update", "delete"].includes(action)) {
                return null;
            }

            const modelResource = this.extractString(parsed, ["modelResource", "model"]);
            if (!modelResource) {
                return null;
            }

            const payload = this.extractObject(parsed, ["data", "payload", "record"]);
            const criteria = this.extractObject(parsed, ["criteria", "where", "filter"]);

            return {
                action: action as AgentAction,
                modelResource,
                payload,
                criteria,
            };
        } catch {
            return null;
        }
    }

    private usageMessage(): string {
        return [
            "Provide JSON instructions so the OpenAI agent can execute them with your permissions.",
            "Example:",
            "```json",
            "{",
            '  "action": "create",',
            '  "modelResource": "Example",',
            '  "data": { "title": "Hello from the agent" }',
            "}",
            "```",
            "The agent uses DataAccessor, so any field-level restrictions from your account are respected.",
        ].join("\n");
    }

    private async userHasPermission(modelResource: ModelResource, user: User, action: ActionType): Promise<boolean> {
        const token = this.getPermissionToken(modelResource, action);
        return await this.context.checkPermission(token, user);
    }

    private getPermissionToken(modelResource: ModelResource, action: ActionType): string {
        const verb = ACTION_TOKENS[action];
        const modelName = modelResource.model?.modelname ?? modelResource.config?.model ?? modelResource.name;
        return `${verb}-${modelName}-model`.toLowerCase();
    }

    private extractPrimaryKey(record: Partial<Record<string, unknown>>, modelResource: ModelResource): unknown {
        if (!record) {
            return undefined;
        }
        const primaryKey = (modelResource.model as any)?.primaryKey ?? "id";
        return (record as Record<string, unknown>)[primaryKey];
    }

    private extractString(source: any, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = source?.[key];
            if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
            }
        }
        return undefined;
    }

    private extractObject(source: any, keys: string[]): Record<string, unknown> | undefined {
        for (const key of keys) {
            const value = source?.[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
                return value as Record<string, unknown>;
            }
        }
        return undefined;
    }
}
