import type {User} from '../../models/User';
import type {Adminizer} from '../Adminizer';
import type {AppRuntime} from '../app-manager/AdminizerApp';
import {buildBuiltinAgentSkills} from './builtinAgentSkills';

/** Identity of the admin user on whose behalf a skill runs. */
export interface AiAssistantSkillUser {
    id?: number;
    login: string;
    fullName?: string;
    email?: string;
    locale?: string;
    isAdministrator: boolean;
    groups: string[];
}

export interface AiAssistantAgentSkillContext {
    user: User;
    /** The same user as a plain descriptor, safe to return in a tool result. */
    userIdentity: AiAssistantSkillUser;
    runtime: AppRuntime;
}

/** A server-side tool made available to every compatible registered agent. */
export interface AiAssistantAgentSkill {
    id: string;
    description: string;
    inputSchema: Record<string, unknown>;
    accessRightsToken?: string;
    /**
     * Advertise the calling user inside the input schema. The agent then sees
     * who it acts for and echoes it back; the value is always overwritten with
     * the authenticated identity, so it cannot be used to impersonate.
     */
    requiresUser?: boolean;
    /**
     * Per-user refinement of what the agent is told about this skill, e.g. an
     * enum of the models this particular user may read.
     */
    describe?(user: User, adminizer: Adminizer):
        | {description?: string; inputSchema?: Record<string, unknown>}
        | Promise<{description?: string; inputSchema?: Record<string, unknown>} | undefined>
        | undefined;
    execute(input: Record<string, unknown>, context: AiAssistantAgentSkillContext): unknown | Promise<unknown>;
}

export type AiAssistantAgentSkillDescriptor = Omit<AiAssistantAgentSkill, 'execute' | 'describe'>;

type RegisteredSkill = AiAssistantAgentSkill & {owner: string};

/** Input property that carries the calling user for `requiresUser` skills. */
export const CURRENT_USER_PARAM = 'currentUser';

export class AiAssistantAgentSkillHandler {
    private readonly skills = new Map<string, RegisteredSkill>();

    constructor(private readonly adminizer: Adminizer) {
        // Built-in skills only read `adminizer` when they run, so registering
        // them from the constructor is safe while Adminizer is still wiring up.
        for (const skill of buildBuiltinAgentSkills(adminizer)) this.add(skill);
    }

    add(skill: AiAssistantAgentSkill, owner = 'host'): void {
        const id = skill.id.trim().toLowerCase();
        if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error(`Invalid AI assistant skill id: ${skill.id}`);
        if (!skill.description.trim()) throw new Error(`AI assistant skill "${id}" requires a description`);
        if (this.skills.has(id)) throw new Error(`AI assistant skill "${id}" is already registered`);
        this.skills.set(id, {...skill, id, owner});
    }

    remove(id: string, owner?: string): boolean {
        const skill = this.skills.get(id);
        if (!skill || (owner && skill.owner !== owner)) return false;
        return this.skills.delete(id);
    }

    /** Skills this user may call, described with their permissions applied. */
    async getAvailable(user: User): Promise<AiAssistantAgentSkillDescriptor[]> {
        const available: AiAssistantAgentSkillDescriptor[] = [];
        for (const skill of this.skills.values()) {
            if (await this.isPermitted(skill, user)) available.push(await this.describe(skill, user));
        }
        return available;
    }

    async execute(id: string, input: Record<string, unknown>, user: User): Promise<unknown> {
        const skill = this.skills.get(id.trim().toLowerCase());
        if (!skill || !await this.isPermitted(skill, user)) {
            throw new Error(`AI assistant skill "${id}" is not available`);
        }
        const userIdentity = this.describeUser(user);
        // Whatever the model passed as the user is discarded: a skill acts for
        // the authenticated admin user only.
        const payload = skill.requiresUser
            ? {...input, [CURRENT_USER_PARAM]: userIdentity.login}
            : input;
        return skill.execute(payload, {
            user,
            userIdentity,
            runtime: this.adminizer.appManager.createRuntime(skill.owner),
        });
    }

    /** Plain, JSON-safe identity of an admin user. */
    describeUser(user: User): AiAssistantSkillUser {
        return {
            id: user.id,
            login: user.login,
            fullName: user.fullName || undefined,
            email: user.email || undefined,
            locale: user.locale || undefined,
            isAdministrator: Boolean(user.isAdministrator),
            groups: (user.groups ?? []).map((group: any) => group?.name).filter(Boolean),
        };
    }

    private async isPermitted(skill: RegisteredSkill, user: User): Promise<boolean> {
        return !skill.accessRightsToken || this.adminizer.accessRightsHelper.hasPermission(skill.accessRightsToken, user);
    }

    private async describe(skill: RegisteredSkill, user: User): Promise<AiAssistantAgentSkillDescriptor> {
        const refinement = await skill.describe?.(user, this.adminizer) ?? {};
        const {execute: _execute, describe: _describe, owner: _owner, ...rest} = skill;
        const inputSchema = {...(refinement.inputSchema ?? skill.inputSchema)};

        if (skill.requiresUser) {
            const identity = this.describeUser(user);
            const properties = {...(inputSchema.properties as Record<string, unknown> ?? {})};
            properties[CURRENT_USER_PARAM] = {
                type: 'string',
                enum: [identity.login],
                description: `Login of the admin user this conversation belongs to (id ${identity.id}`
                    + `${identity.fullName ? `, ${identity.fullName}` : ''}). Always pass "${identity.login}".`,
            };
            const required = new Set([...(inputSchema.required as string[] ?? []), CURRENT_USER_PARAM]);
            inputSchema.properties = properties;
            inputSchema.required = [...required];
        }

        return {...rest, description: refinement.description ?? skill.description, inputSchema};
    }
}
