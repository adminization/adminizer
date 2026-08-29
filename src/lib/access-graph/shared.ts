/**
 * Shared primitives of record-level access control, used by both
 * `RecordAccessResolver` (the `userAccessRelation` forms) and `AccessGraphResolver`
 * (access graphs): CRUD token naming, the `Group.tokens` grant comparison and
 * membership (`through`/`via`[/`group`]) declaration resolution.
 */
import { ActionType } from "../../interfaces/adminpanelConfig";
import { parseGroupPermissionGrant } from "../../helpers/accessRightsHelper";
import { Group } from "../../models/Group";
import type { ModelHandler } from "../model/ModelHandler";

export const MODEL_TOKEN_SUFFIX = "model";

/** CRUD token id of a verb on a model; registered token ids are lowercased. */
export function modelCrudToken(actionVerb: string, modelName: string): string {
    return `${actionVerb}-${modelName}-${MODEL_TOKEN_SUFFIX}`.toLowerCase();
}

/**
 * Token letting its holder set the access relation of a record explicitly — the panel
 * equivalent of transferring ownership. Registered only for models that declare
 * `userAccessRelation`, and granted to nobody by default: without it a non-administrator
 * can neither stamp a foreign owner on create nor move a record out of reach.
 */
export function ownershipTransferToken(modelName: string): string {
    return `transfer-${modelName}-ownership`.toLowerCase();
}

/** Maps a panel action to its CRUD token verb. */
export function getTokenAction(apAction: ActionType) {
    switch (apAction) {
        case "add":
            return "create";
        case "list":
        case "view":
            return "read";
        case "edit":
            return "update";
        case "remove":
            return "delete";
    }
}

/** A relation value may arrive populated (object) or as a bare id. */
export function relationValueId(value: unknown, primaryKey: string = "id"): unknown {
    if (value && typeof value === "object") {
        return (value as Record<string, unknown>)[primaryKey];
    }
    return value;
}

/**
 * Like `hasAssignedPermission`, but case-insensitive for plain string grants —
 * registered token ids are lowercased.
 */
export function grantsToken(grants: unknown[], tokenId: string): boolean {
    return grants.some((grant) =>
        (typeof grant === "string" && grant.toLowerCase() === tokenId) ||
        parseGroupPermissionGrant(grant)?.tokenId === tokenId
    );
}

/** Resolved membership declaration: the `through` model with its relation aliases and FK columns. */
export interface ResolvedMembership {
    through: string;
    /** Association alias in the membership model pointing at the membership target. */
    targetAlias: string;
    /** Its foreign-key column — plain (unpopulated) rows carry the value there. */
    targetFk: string;
    viaAlias: string;
    groupAlias?: string;
    groupFk?: string;
}

/** Minimal model access the shared membership queries need (an internal-scope accessor). */
export type MembershipModelSource = (resourceName: string) => {
    find(criteria: unknown): Promise<Record<string, unknown>[] | null | undefined>;
};

/**
 * Resolves a membership declaration against the registered models: `through` must
 * carry exactly one relation to `targetResource`, a `via` relation to User and,
 * optionally, a `group` relation to Group. `formatError` wraps the failure text into
 * the caller's error shape (userAccessRelation vs accessGraph wording).
 */
export function resolveMembership(
    declaration: { through?: string; via?: string; group?: string },
    targetResource: string,
    modelHandler: ModelHandler,
    formatError: (message: string) => Error
): ResolvedMembership {
    const { through, via, group } = declaration;

    if (!through) {
        throw formatError(`membership "through" is required`);
    }
    if (!via) {
        throw formatError(`membership "via" is required`);
    }

    const throughRecord = modelHandler.getResourceRecord(through);
    if (!throughRecord) {
        throw formatError(`membership model "${through}" not found`);
    }

    const resolveTarget = (attribute?: { model?: string; resourceName?: string }) =>
        attribute?.model ? modelHandler.resolveAssociationResource(attribute.model, attribute.resourceName) : undefined;

    const throughAttributes = throughRecord.model.attributes;
    const viaRelation = throughAttributes[via];
    if (resolveTarget(viaRelation) !== "User") {
        throw formatError(
            `unsupported or invalid via field "${via}" in membership model "${through}". ` +
            `Currently, only relations to "User" are supported`
        );
    }

    if (group) {
        const groupRelation = throughAttributes[group];
        if (resolveTarget(groupRelation) !== "Group") {
            throw formatError(
                `invalid group field "${group}" in membership model "${through}": a relation to "Group" is required`
            );
        }
    }

    const targetAliases = Object.entries(throughAttributes)
        .filter(([key, attribute]) =>
            key !== via && key !== group && resolveTarget(attribute) === targetResource
        )
        .map(([key]) => key);
    if (targetAliases.length !== 1) {
        throw formatError(
            `cannot resolve the target relation in membership model "${through}": ` +
            `expected exactly one relation to "${targetResource}", found ${targetAliases.length}`
        );
    }

    const targetAlias = targetAliases[0];
    return {
        through: throughRecord.name,
        targetAlias,
        targetFk: (throughAttributes[targetAlias].via as string | undefined) ?? targetAlias,
        viaAlias: via,
        groupAlias: group,
        groupFk: group ? ((throughAttributes[group].via as string | undefined) ?? group) : undefined,
    };
}

/**
 * Target ids the user reaches through membership rows; with a `group` declared,
 * only memberships whose group carries `grantedTokenId` count.
 */
export async function membershipTargetIds(
    getModel: MembershipModelSource,
    membership: ResolvedMembership,
    userId: unknown,
    targetPrimaryKey: string,
    grantedTokenId: string
): Promise<unknown[]> {
    const rows: Record<string, unknown>[] =
        await getModel(membership.through).find({ where: { [membership.viaAlias]: userId } }) ?? [];

    const membershipGroupId = (row: Record<string, unknown>) =>
        relationValueId(row[membership.groupFk!] ?? row[membership.groupAlias!]);

    let allowedRows = rows;
    if (membership.groupAlias) {
        const groupIds = rows
            .map(membershipGroupId)
            .filter((id) => id !== null && id !== undefined);
        const grantedGroupIds = await groupsGrantingToken(getModel, Array.from(new Set(groupIds)), grantedTokenId);
        allowedRows = rows.filter((row) => grantedGroupIds.has(String(membershipGroupId(row))));
    }

    return Array.from(new Set(
        allowedRows
            .map((row) => relationValueId(row[membership.targetFk] ?? row[membership.targetAlias], targetPrimaryKey))
            .filter((id) => id !== null && id !== undefined)
    ));
}

/** Ids of the given groups whose token list carries `tokenId`. */
export async function groupsGrantingToken(
    getModel: MembershipModelSource,
    groupIds: unknown[],
    tokenId: string
): Promise<Set<string>> {
    if (!groupIds.length) {
        return new Set();
    }

    const groups = (await getModel("Group").find({ where: { id: { in: groupIds as number[] } } }) ?? []) as unknown as Group[];
    return new Set(
        groups
            .filter((group) => grantsToken(group.tokens ?? [], tokenId))
            .map((group) => String(group.id))
    );
}
