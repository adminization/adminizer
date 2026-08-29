/**
 * Demo data of the access-graph app: two projects, their members, tasks and messages.
 *
 * Everything here is idempotent and ORM-agnostic — it goes through the app's own model
 * access (`runtime.models`), so the same code seeds the Sequelize and the TypeORM fixture.
 */
import type {AppRuntime, InternalModelRepository} from "../../../dist";
import {projectGraphModelNames} from "./ProjectGraphModels";

type Models = AppRuntime["models"];
// Named explicitly rather than read off `Models["get"]`: extracting the return type of a
// generic method instantiates it with `unknown` instead of its `any` default, and a `where`
// over an unknown model accepts no field at all.
type Repo = InternalModelRepository;
type Row = Record<string, any>;

/** Roles are plain Group records: their tokens decide what a membership counts for. */
export const projectGraphRoles = {
    editor: "Project editors",
    viewer: "Project viewers",
} as const;

const MODEL_TOKENS = (modelName: string, verbs: string[]) =>
    verbs.map((verb) => `${verb}-${modelName}-model`.toLowerCase());

/**
 * Full rights inside a project: everything on tasks and messages, plus renaming the
 * project itself. Creating projects stays with administrators — a project nobody is a
 * member of would be invisible to its own author.
 */
const EDITOR_TOKENS = [
    ...MODEL_TOKENS(projectGraphModelNames.project, ["read", "update"]),
    ...MODEL_TOKENS(projectGraphModelNames.task, ["create", "read", "update", "delete"]),
    ...MODEL_TOKENS(projectGraphModelNames.message, ["create", "read", "update", "delete"]),
];

/**
 * The panel refuses the login itself for a user whose groups lack this token, so without
 * it the demo users could not be tried out by hand at all.
 */
const PANEL_LOGIN_TOKEN = "access-to-adminpanel";

/** Read-only inside a project. */
const VIEWER_TOKENS = [
    ...MODEL_TOKENS(projectGraphModelNames.project, ["read"]),
    ...MODEL_TOKENS(projectGraphModelNames.task, ["read"]),
    ...MODEL_TOKENS(projectGraphModelNames.message, ["read"]),
];

export interface ProjectGraphSeedOptions {
    /**
     * Global group of the demo users. Global tokens are the upper bound of the graph —
     * without them a member cannot enter the section at all — so this group gets the
     * editor token set and the per-project role narrows it back down.
     */
    baseGroup: string;
}

export async function seedProjectGraph(models: Models, options: ProjectGraphSeedOptions): Promise<void> {
    const groups = models.get("Group");
    const users = models.get("User");
    const projects = models.get(projectGraphModelNames.project);
    const members = models.get(projectGraphModelNames.member);
    const tasks = models.get(projectGraphModelNames.task);
    const messages = models.get(projectGraphModelNames.message);

    const editorRole = await ensureGroup(groups, projectGraphRoles.editor, "Full access inside the projects they are a member of", EDITOR_TOKENS);
    const viewerRole = await ensureGroup(groups, projectGraphRoles.viewer, "Read-only inside the projects they are a member of", VIEWER_TOKENS);
    await grantTokens(groups, options.baseGroup, [PANEL_LOGIN_TOKEN, ...EDITOR_TOKENS]);

    if (await projects.count()) {
        return; // already seeded
    }

    const apollo = await projects.create({
        name: "Apollo",
        description: "Landing page and delivery for the Apollo release",
    }) as Row;
    const borealis = await projects.create({
        name: "Borealis",
        description: "Internal API of the Borealis platform",
    }) as Row;

    // user1 works on Apollo, user3 watches Borealis, user2 sits in both — read-only in
    // Apollo, editor in Borealis. Which is the point of the per-project role.
    const memberships: [string, Row, Row | undefined][] = [
        ["user1", apollo, editorRole],
        ["user2", apollo, viewerRole],
        ["user2", borealis, editorRole],
        ["user3", borealis, viewerRole],
    ];

    const userIds = new Map<string, unknown>();
    for (const [login, project, role] of memberships) {
        const user = await findUser(users, login, userIds);
        if (!user) {
            continue;
        }
        await members.create({project: project.id, user, group: role?.id ?? null});
    }

    const board: [Row, string, string, string[]][] = [
        [apollo, "Design the landing page", "in_progress", [
            "The hero section is ready for review.",
            "Let's keep the pricing block above the fold.",
        ]],
        [apollo, "Set up CI", "open", [
            "Builds are green on the feature branches.",
        ]],
        [borealis, "Draft the API spec", "open", [
            "Pagination is still open — cursor or offset?",
            "Cursor. Offsets break on concurrent writes.",
        ]],
        [borealis, "Pick a logo", "done", [
            "Third variant it is.",
        ]],
    ];

    for (const [project, title, status, texts] of board) {
        const task = await tasks.create({title, status, project: project.id}) as Row;
        const author = await findUser(users, project === apollo ? "user1" : "user2", userIds);
        for (const text of texts) {
            await messages.create({text, task: task.id, author: author ?? null});
        }
    }
}

async function ensureGroup(groups: Repo, name: string, description: string, tokens: string[]): Promise<Row | undefined> {
    const existing = await groups.findOne({where: {name}}) as Row | null;
    if (existing) {
        return existing;
    }
    return await groups.create({name, description, tokens}) as Row;
}

/** Adds the demo tokens to an existing group without dropping what it already carries. */
async function grantTokens(groups: Repo, name: string, tokens: string[]): Promise<void> {
    const group = await groups.findOne({where: {name}}) as Row | null;
    if (!group) {
        return;
    }

    const current: unknown[] = Array.isArray(group.tokens) ? group.tokens : [];
    const missing = tokens.filter((token) => !current.includes(token));
    if (!missing.length) {
        return;
    }

    await groups.updateOne({where: {id: group.id}}, {tokens: [...current, ...missing]} as Row);
}

async function findUser(users: Repo, login: string, cache: Map<string, unknown>): Promise<unknown> {
    if (!cache.has(login)) {
        const user = await users.findOne({where: {login}}) as Row | null;
        cache.set(login, user?.id);
    }
    return cache.get(login);
}
