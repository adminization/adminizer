/**
 * Record-scoped access rights, packaged as an app: a token that is granted per Test record
 * instead of per model.
 *
 * The app owns the whole demo, so it shows something the moment the fixture boots — the
 * token, its options, the two groups that hold different slices of it, the fixture users
 * assigned to them, and a page that evaluates `hasPermission` for all of them side by side.
 * Nothing has to be clicked together in the panel first.
 *
 * Nothing here is derived from relations: every reachable record is named explicitly in
 * the group's grant, which is the list `getOptions` fills the group form with.
 */
import path from "path";
import {AbstractAdminizerApp, AppSetupContext, AppRuntime} from "../../../dist";
import {
    pickDemoRecords,
    readGrant,
    recordScopeDemoGroups,
    recordScopeDemoMembers,
    seedRecordScope,
} from "./recordScopeSeed";

export const RECORD_SCOPE_TEST_TOKEN = "record-scope-test";

type Row = Record<string, any>;

interface RecordScopeTestAppConfig {
    route: string;
    sidebarId: string;
    title: string;
    icon: string;
    section: string;
    token: string;
    componentFile: string;
    devComponentUrl: string;
}

export class RecordScopeTestApp extends AbstractAdminizerApp<RecordScopeTestAppConfig> {
    readonly name = "record-scope-test";
    readonly version = "1.0.0";
    declare readonly config: RecordScopeTestAppConfig;

    /** Captured while the app is enabled; the seeding step and `getOptions` use it. */
    private runtime?: AppRuntime;

    constructor(config: Partial<RecordScopeTestAppConfig> = {}) {
        super();
        this.config = {
            route: "/record-scope-test",
            sidebarId: "record-scope-test",
            title: "Record scope test",
            icon: "security",
            section: "Fixture",
            token: RECORD_SCOPE_TEST_TOKEN,
            componentFile: path.resolve(import.meta.dirname, "RecordScopeTest.es.js"),
            devComponentUrl: "/fixture/apps/record-scope-test/RecordScopeTest.tsx",
            ...config,
        };
    }

    /**
     * Writes the demo groups and their memberships. Called by the host rather than on
     * `app:enabled`, because both the Test records the grants name and the users they are
     * assigned to exist only once the host has seeded them. Idempotent.
     */
    async seedDemoData(): Promise<void> {
        if (!this.runtime) {
            throw new Error(`App "${this.name}" must be enabled before seeding its demo data`);
        }
        await seedRecordScope(this.runtime.models, this.config.token);
    }

    setup(ctx: AppSetupContext): void {
        ctx.accessRight({
            id: this.config.token,
            name: "Test record access",
            description: "Access to individually selected Test records",
            department: this.config.section,
            /** Fills the checkbox list of the group form — one option per Test record. */
            getOptions: async () => {
                const records = await this.runtime?.models.get<Row>("Test").find({}) ?? [];
                return records.map((record) => ({
                    id: String(record.id),
                    name: String(record.title ?? record.id),
                }));
            },
            /**
             * `rights` is the union of the record ids the user's groups grant for this
             * token; the caller says which record it is asking about.
             */
            check: async (_user, context) => {
                const testId = context?.testId;
                return typeof testId === "string" || typeof testId === "number"
                    ? context?.rights?.includes(String(testId)) ?? false
                    : false;
            },
        });

        // User and Group are read by the seeding step and by the page's access matrix.
        ctx.modelAccess({models: ["Test", "User", "Group"]});

        const moduleComponent = ctx.asset({
            id: "component",
            filePath: this.config.componentFile,
            devUrl: this.config.devComponentUrl,
        });

        const pageUrl = ctx.controller({
            id: "page",
            method: "get",
            route: this.config.route,
            middleware: this.renderModule(moduleComponent),
            policies: [{type: "auth", mode: "ui"}],
        });

        ctx.config({
            navbar: {
                additionalLinks: [{
                    id: this.config.sidebarId,
                    title: this.config.title,
                    type: "self",
                    link: pageUrl,
                    icon: this.config.icon as any,
                    section: this.config.section,
                }],
            },
        });

        ctx.listener("app:enabled", (payload: {appName?: string}, runtime: AppRuntime) => {
            if (payload?.appName === this.name) {
                this.runtime = runtime;
            }
        });
        ctx.listener("app:disabled", (payload: {appName?: string}) => {
            if (payload?.appName === this.name) {
                this.runtime = undefined;
            }
        });
    }

    private renderModule(moduleComponent: string): MiddlewareType {
        return async (req, res) => {
            return req.Inertia.render({
                component: "module",
                props: {moduleComponent, data: await this.buildDemoState(req)},
            });
        };
    }

    /**
     * Everything the page needs to be self-evident: the demo records, who was granted what,
     * and the actual `hasPermission` answer for every demo user against every demo record.
     */
    private async buildDemoState(req: ReqType) {
        const {models, accessRights} = req.runtime;
        const token = this.config.token;

        const demoRecords = await pickDemoRecords(models);
        const totalRecords = await models.get<Row>("Test").count();

        const groups = await Promise.all(recordScopeDemoGroups.map(async (demoGroup) => {
            const group = await models.get<Row>("Group").findOne({where: {name: demoGroup.name}});
            return {
                name: demoGroup.name,
                description: demoGroup.description,
                exists: Boolean(group),
                rights: group ? readGrant(group.tokens, token) : [],
            };
        }));

        const users = (await Promise.all(Object.keys(recordScopeDemoMembers).map(async (login) => {
            const user = await models.get<Row>("User").findOne({where: {login}, populate: {groups: true}});
            if (!user) {
                return null;
            }

            const granted = accessRights.getPermissionRights(token, user as any);
            return {
                login,
                isAdministrator: Boolean(user.isAdministrator),
                groups: (Array.isArray(user.groups) ? user.groups : []).map((group: Row) => String(group.name)),
                // The real decision, one call per demo record — the same one the panel makes
                allowed: await this.allowedIds(req, demoRecords, user),
                // `null` rights mean "not narrowed by the token at all", i.e. administrator
                grantedTotal: granted === null ? totalRecords : granted.length,
            };
        }))).filter(Boolean);

        const visible = await this.allowedIds(req, await models.get<Row>("Test").find({}), req.user);

        return {
            token,
            totalRecords,
            // Rewritten on every boot, so an empty grant means the Test table is still empty
            seeded: groups.every((group) => group.rights.length > 0),
            records: demoRecords.map((record, index) => ({
                index: index + 1,
                id: String(record.id),
                title: String(record.title ?? record.id),
            })),
            groups,
            users,
            current: {
                login: String(req.user?.login ?? ""),
                isAdministrator: Boolean(req.user?.isAdministrator),
                groups: (Array.isArray(req.user?.groups) ? req.user.groups : []).map((group: Row) => String(group.name)),
                visibleCount: visible.length,
                visible: visible.slice(0, 12).map((id) => {
                    const record = demoRecords.find((demoRecord) => String(demoRecord.id) === id);
                    return {id, title: record ? String(record.title ?? id) : id};
                }),
            },
        };
    }

    private async allowedIds(req: ReqType, records: Row[], user: unknown): Promise<string[]> {
        const decisions = await Promise.all(records.map(async (record) => ({
            id: String(record.id),
            allowed: await req.runtime.accessRights.hasPermission(this.config.token, user as any, {
                testId: String(record.id),
            }),
        })));
        return decisions.filter(({allowed}) => allowed).map(({id}) => id);
    }
}
