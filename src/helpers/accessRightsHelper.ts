import {UserAP} from "../models/UserAP";
import {AccessRightsToken} from "../interfaces/types";
import {Adminizer} from "../lib/Adminizer";
import {GroupAP} from "../models/GroupAP";
import {bool} from "sharp";

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

        for (let i = 0; i < this._tokens.length; i++) {
            if (this._tokens[i].id === accessRightsToken.id) {
                this._tokens.splice(i, 1);
                break;
            }
        }
        this._tokens.push(accessRightsToken);
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

    public enoughPermissions(tokens: string[], user: UserAP): boolean {
        if (user.isAdministrator) {
            return true;
        }

        // No tokens required — access granted for all authenticated users
        if (!tokens.length) {
            return true;
        }

        return tokens.some((token) => this.hasPermission(token, user));
    }

    public hasPermission(tokenId: string | undefined, user: UserAP, context?: string): boolean {
        if (!this.adminizer.config.auth.enable) {
            return true;
        }

        if (user.isAdministrator) {
            return true;
        }

        if (!tokenId) {
            Adminizer.log.warn(
                `AccessRightsHelper > hasPermission: missing accessRightsToken${context ? ` [${context}]` : ''}`
            )
            return false
        }

        tokenId = tokenId.toLowerCase()
        const tokenIsValid = this._tokens.some((token) => token.id === tokenId);

        if (!tokenIsValid) {
            Adminizer.log.error("Adminpanel > Token is not valid", tokenId, user.login);
            return false;
        }
        if (!user.groups) {
            Adminizer.log.error('User has no groups')
            return false
        }
        return user.groups.some((group: GroupAP) => group.tokens?.includes(tokenId));
    }
}


export class GroupsAccessRightsHelper {
    static hasAccess(
        user: UserAP,
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