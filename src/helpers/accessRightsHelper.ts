import {User} from "../models/User";
import {AccessRightsToken, GroupPermissionGrant, PermissionContext} from "../interfaces/types";
import {Adminizer} from "../lib/Adminizer";
import {Group} from "../models/Group";

export function parseGroupPermissionGrant(value: unknown): GroupPermissionGrant | null {
    if (
        !value ||
        typeof value !== "object" ||
        typeof (value as Partial<GroupPermissionGrant>).tokenId !== "string" ||
        !Array.isArray((value as Partial<GroupPermissionGrant>).rights) ||
        !(value as Partial<GroupPermissionGrant>).rights!.every((right) => typeof right === "string" || typeof right === "number")
    ) {
        return null;
    }

    const parsed = value as Partial<GroupPermissionGrant>;
    return {
        tokenId: parsed.tokenId!.toLowerCase(),
        rights: Array.from(new Set(parsed.rights!.map(String))),
    };
}

export class AccessRightsHelper {

    private _tokens: AccessRightsToken[] = [];
    public adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer;
    }

    public registerToken(accessRightsToken: AccessRightsToken): void {
        accessRightsToken.id = accessRightsToken.id.toLowerCase()
        if (!accessRightsToken.id || !accessRightsToken.name || !accessRightsToken.description || !accessRightsToken.department) {
            throw new Error("Adminpanel > Can not register token: Missed one or more required parameters");
        }
        if (accessRightsToken.getOptions && typeof accessRightsToken.getOptions !== "function") {
            throw new Error("Adminpanel > Can not register token: getOptions must be a function");
        }
        if (accessRightsToken.check && typeof accessRightsToken.check !== "function") {
            throw new Error("Adminpanel > Can not register token: check must be a function");
        }

        for (let i = 0; i < this._tokens.length; i++) {
            if (this._tokens[i].id === accessRightsToken.id) {
                this._tokens.splice(i, 1);
                break;
            }
        }
        this._tokens.push(accessRightsToken);
    }

    public unregisterToken(tokenId: string): boolean {
        const normalizedTokenId = tokenId.toLowerCase();
        const index = this._tokens.findIndex((token) => token.id === normalizedTokenId);
        if (index === -1) {
            return false;
        }

        this._tokens.splice(index, 1);
        return true;
    }

    public hasToken(tokenId: string): boolean {
        const normalizedTokenId = tokenId.toLowerCase();
        return this._tokens.some((token) => token.id === normalizedTokenId);
    }

    public getToken(tokenId: string): AccessRightsToken | undefined {
        const normalizedTokenId = tokenId.toLowerCase();
        return this._tokens.find((token) => token.id === normalizedTokenId);
    }

    public registerTokens(accessRightsTokens: AccessRightsToken[]): void {
        for (let token of accessRightsTokens) {
            this.registerToken(token);
        }
    }

    public registerModelTokens(modelName: string, department?: string): void {
        department = department ?? `Model ${modelName}`;
        this.registerToken({ id: `create-${modelName}-model`, name: "Create", description: "Access to creating record in database", department });
        this.registerToken({ id: `read-${modelName}-model`, name: "Read", description: "Access to reading records in database", department });
        this.registerToken({ id: `update-${modelName}-model`, name: "Update", description: "Access to updating records in database", department });
        this.registerToken({ id: `delete-${modelName}-model`, name: "Delete", description: "Access to deleting records in database", department });
    }

    public getTokens(): AccessRightsToken[] {
        return this._tokens;
    }

    public getTokensByDepartment(department: string): AccessRightsToken[] {
        return this._tokens.filter((token) => token.department === department);
    }

    public getAllDepartments(): string[] {
        return this._tokens
            .map((token) => token.department)
            .filter((item, pos, self) => self.indexOf(item) === pos);
    }

    public async enoughPermissions(tokens: string[], user: User): Promise<boolean> {
        if (user.isAdministrator) {
            return true;
        }

        // No tokens required — access granted for all authenticated users
        if (!tokens.length) {
            return true;
        }

        for (const token of tokens) {
            if (await this.hasPermission(token, user)) {
                return true;
            }
        }

        return false;
    }

    /** Fail-closed synchronous variant of {@link enoughPermissions}. */
    public enoughStaticPermissions(tokens: string[], user: User): boolean {
        if (user.isAdministrator) {
            return true;
        }

        if (!tokens.length) {
            return true;
        }

        return tokens.some((token) => this.hasStaticPermission(token, user));
    }

    /**
     * The single access decision: the token exists, a group of this user carries
     * it, and — for a contextual token — its own `check` accepts the context.
     *
     * Always asynchronous on purpose. A `boolean | Promise<boolean>` union made
     * `if (hasPermission(...))` compile while silently granting access, because
     * a pending promise is truthy. Callers that genuinely cannot await use
     * {@link hasStaticPermission} instead.
     */
    public async hasPermission(
        tokenId: string | undefined,
        user: User,
        context?: PermissionContext,
    ): Promise<boolean> {
        if (!this.adminizer.config.auth.enable || user.isAdministrator) {
            return true;
        }

        const token = this.getRegisteredToken(tokenId);
        if (!token) {
            return false;
        }
        if (!this.hasAssignedPermission(token.id, user)) {
            return false;
        }

        if (!token.check) {
            return true;
        }

        return this.runTokenCheck(token, user, context ?? {});
    }

    /**
     * Synchronous access decision for call sites that cannot await, such as the
     * field configuration built by `DataAccessor`.
     *
     * A contextual token is denied here: its `check` is asynchronous and there
     * is no context to hand it, so the only safe answer is "no". Model CRUD
     * tokens never declare `check`, so the ordinary panel paths are unaffected.
     */
    public hasStaticPermission(tokenId: string | undefined, user: User): boolean {
        if (!this.adminizer.config.auth.enable || user.isAdministrator) {
            return true;
        }

        const token = this.getRegisteredToken(tokenId);
        if (!token) {
            return false;
        }
        if (!this.hasAssignedPermission(token.id, user)) {
            return false;
        }

        if (token.check) {
            Adminizer.log.warn(
                "AccessRightsHelper > hasStaticPermission: contextual token denied in a synchronous check",
                token.id,
            );
            return false;
        }

        return true;
    }

    /** Returns trusted option IDs granted by all groups for a contextual token. */
    public getPermissionRights(tokenId: string | undefined, user: User): string[] | null {
        if (!this.adminizer.config.auth.enable) {
            return null;
        }

        if (user.isAdministrator) {
            return null;
        }

        const token = this.getRegisteredToken(tokenId);
        if (!token) {
            return [];
        }
        if (!user.groups) {
            Adminizer.log.error('User has no groups');
            return [];
        }

        const rights = user.groups.flatMap((group: Group) => group.tokens ?? [])
            .map(parseGroupPermissionGrant)
            .filter((grant): grant is GroupPermissionGrant =>
                grant?.tokenId === token.id
            )
            .flatMap((grant) => grant.rights);

        return Array.from(new Set(rights));
    }

    private getRegisteredToken(tokenId: string | undefined): AccessRightsToken | undefined {
        if (!tokenId) {
            Adminizer.log.warn("AccessRightsHelper > hasPermission: missing accessRightsToken");
            return undefined;
        }

        const token = this.getToken(tokenId);
        if (!token) {
            Adminizer.log.error("Adminpanel > Token is not valid", tokenId);
        }
        return token;
    }

    private hasAssignedPermission(tokenId: string, user: User): boolean {
        if (!this.adminizer.config.auth.enable || user.isAdministrator) {
            return true;
        }
        if (!user.groups) {
            Adminizer.log.error("User has no groups");
            return false;
        }

        return user.groups.some((group: Group) => group.tokens?.some((groupToken) =>
            groupToken === tokenId || parseGroupPermissionGrant(groupToken)?.tokenId === tokenId
        ));
    }

    private async runTokenCheck(token: AccessRightsToken, user: User, context: PermissionContext): Promise<boolean> {
        try {
            const rights = this.getPermissionRights(token.id, user) ?? [];
            return await token.check!(user, {...context, rights});
        } catch (error) {
            Adminizer.log.error("AccessRightsHelper > token check failed", token.id, error);
            return false;
        }
    }
}


export class GroupsAccessRightsHelper {
    static hasAccess(
        user: User,
        groupsAccessRights?: string[]
    ): boolean {
        const userGroups = user.groups?.map(group => group.name.toLowerCase());

        if (groupsAccessRights) {
            const allowedGroups = groupsAccessRights.map(item => item.toLowerCase());
            return userGroups?.some(group => allowedGroups.includes(group)) ?? false;
        } else {
            return true
        }
    }
}
