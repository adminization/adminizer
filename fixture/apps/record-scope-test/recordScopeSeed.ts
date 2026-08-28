/**
 * Demo data of the record-scope app: two groups that carry the contextual token over a
 * different slice of the Test table, plus the fixture users assigned to them.
 *
 * Idempotent and self-healing. A grant names Test records by id, and reseeding the fixture
 * gives the table fresh uuids — so a grant whose ids are gone is rewritten instead of left
 * in place, which is what kept the demo page opening on "nothing is available".
 */
import {parseGroupPermissionGrant} from "../../../dist";
import type {AppRuntime, PermissionGrant} from "../../../dist";

type Models = AppRuntime["models"];
type Row = Record<string, any>;

/** How many Test records the demo reserves for itself, taken from the head of the table. */
export const RECORD_SCOPE_DEMO_SIZE = 5;

export interface RecordScopeDemoGroup {
    name: string;
    description: string;
    /** Slice of the demo records this group grants, `[from, to)`. */
    slice: [number, number];
}

/**
 * Two overlapping slices, and the overlap is the point: `user2` belongs to both groups and
 * sees their union, because record rights add up across groups the way plain tokens do.
 */
export const recordScopeDemoGroups: RecordScopeDemoGroup[] = [
    {
        name: "Test scope: alpha",
        description: "Sees demo Test records #1-#3 through the record-scope token",
        slice: [0, 3],
    },
    {
        name: "Test scope: beta",
        description: "Sees demo Test records #3-#5 through the record-scope token",
        slice: [2, 5],
    },
];

/** Fixture logins the demo assigns. `pass` is listed on purpose: it is the denied control. */
export const recordScopeDemoMembers: Record<string, string[]> = {
    user1: ["Test scope: alpha"],
    user2: ["Test scope: alpha", "Test scope: beta"],
    user3: ["Test scope: beta"],
    pass: [],
};

/**
 * The records the demo talks about. Sorted by id rather than left in table order, so the
 * seeding step and the page agree on which record is "#1" without storing anything.
 */
export async function pickDemoRecords(models: Models): Promise<Row[]> {
    const records = await models.get<Row>("Test").find({});
    return records
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .slice(0, RECORD_SCOPE_DEMO_SIZE);
}

export async function seedRecordScope(models: Models, tokenId: string): Promise<void> {
    const records = await pickDemoRecords(models);
    if (records.length < RECORD_SCOPE_DEMO_SIZE) {
        return; // the host has not seeded the Test table yet — there is nothing to scope
    }

    const ids = records.map((record) => String(record.id));
    for (const group of recordScopeDemoGroups) {
        await ensureGrant(models, group, tokenId, ids.slice(...group.slice));
    }

    await ensureMemberships(models);
}

async function ensureGrant(models: Models, group: RecordScopeDemoGroup, tokenId: string, rights: string[]): Promise<void> {
    const groups = models.get<Row>("Group");
    const existing = await groups.findOne({where: {name: group.name}});
    if (existing && grantsExactly(existing.tokens, tokenId, rights)) {
        return;
    }

    const tokens = withGrant(existing?.tokens, tokenId, rights);
    if (!existing) {
        await groups.create({name: group.name, description: group.description, tokens} as Row);
        return;
    }

    await groups.updateOne({where: {id: existing.id}}, {tokens} as Row);
}

/** Replaces the demo grant while keeping whatever else was assigned to the group by hand. */
function withGrant(tokens: unknown, tokenId: string, rights: string[]): PermissionGrant[] {
    const current: unknown[] = Array.isArray(tokens) ? tokens : [];
    const others = current.filter((token) =>
        token !== tokenId && parseGroupPermissionGrant(token)?.tokenId !== tokenId) as PermissionGrant[];
    return [...others, {tokenId, rights}];
}

function grantsExactly(tokens: unknown, tokenId: string, rights: string[]): boolean {
    const granted = readGrant(tokens, tokenId);
    return granted.length === rights.length && rights.every((right) => granted.includes(right));
}

/** The record ids a group hands out for `tokenId`, ignoring its plain tokens. */
export function readGrant(tokens: unknown, tokenId: string): string[] {
    const current: unknown[] = Array.isArray(tokens) ? tokens : [];
    for (const token of current) {
        const grant = parseGroupPermissionGrant(token);
        if (grant?.tokenId === tokenId) {
            return grant.rights;
        }
    }
    return [];
}

async function ensureMemberships(models: Models): Promise<void> {
    const groups = models.get<Row>("Group");
    const users = models.get<Row>("User");

    for (const [login, groupNames] of Object.entries(recordScopeDemoMembers)) {
        if (!groupNames.length) {
            continue;
        }

        const user = await users.findOne({where: {login}, populate: {groups: true}});
        if (!user) {
            continue;
        }

        const current: unknown[] = Array.isArray(user.groups) ? user.groups.map((group: Row) => group.id) : [];
        const missing: unknown[] = [];
        for (const name of groupNames) {
            const group = await groups.findOne({where: {name}});
            if (group && !current.includes(group.id)) {
                missing.push(group.id);
            }
        }
        if (!missing.length) {
            continue;
        }

        // The association accessor assigns the whole set, so the current groups are re-sent
        await users.updateOne({where: {id: user.id}}, {groups: [...current, ...missing]} as Row);
    }
}
