import {Adminizer} from "../lib/Adminizer";
import {I18n} from "../lib/I18n";
import {parse} from "cookie";
import {verifyUser} from "../lib/helper/jwt";

const ADMINIZER_REQUEST_DEPRECATION_MESSAGE =
    "req.adminizer is deprecated and will no longer be available starting with Adminizer v6. Use req.runtime instead.";

export function createDeprecatedAdminizerProxy(
    adminizer: Adminizer,
    warn: (message: string) => void = (message) => Adminizer.log.warn(message)
): Adminizer {
    let warned = false;

    return new Proxy(adminizer, {
        get(target, property, receiver) {
            if (!warned) {
                warned = true;
                warn(ADMINIZER_REQUEST_DEPRECATION_MESSAGE);
            }

            return Reflect.get(target, property, receiver);
        },
    });
}

export default function bindReqFunctions(adminizer: Adminizer) {
    const deprecatedAdminizer = createDeprecatedAdminizerProxy(adminizer);

    let bindReqFunctionsF = async function (req: ReqType, res: ResType, next: () => void) {

        /**
         * Add adminizer to use in controllers
         * */
        req.adminizer = deprecatedAdminizer;

        // TODO Adminizer v6: replace this temporary base scope when req.adminizer is removed.
        // App controllers receive an app-scoped runtime from ControllerHandler before execution.
        req.runtime = adminizer.appManager.createRuntime("__request__");


        /**
         * Add i18n
         * */
        const hasExternalI18n =
            typeof (req as Partial<ReqType>).i18n?.__ === "function";

        if (!hasExternalI18n) {
            const translationDirectory =
                adminizer.config.translation !== false
                    ? adminizer.config.translation.directory ?? adminizer.config.translation.path
                    : null;
            const missingTranslationDirectory =
                adminizer.config.translation !== false
                    ? adminizer.config.translation.missingTranslationDirectory
                    : null;

            req.i18n = new I18n({
                locales: adminizer.config.translation !== false ? adminizer.config.translation.locales : [],
                directory: translationDirectory ?? null,
                missingDirectory: missingTranslationDirectory ?? null
            });
        }

        if (res.locals) {
            if (hasExternalI18n) {
                const externalI18n = (req as Partial<ReqType>).i18n as any;
                const methods = ["__", "__n", "getLocale", "isPreferredLocale"] as const;
                for (const method of methods) {
                    if (typeof externalI18n?.[method] === "function") {
                        res.locals[method] = externalI18n[method].bind(externalI18n);
                    }
                }
            } else {
                req.i18n.registerMethods(res.locals, req)
            }
        }

        // NOTE: This is here because inertia should receive data to routes
        // JWT token
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.adminizer_jwt;

        if (token) {
            const user = verifyUser(token, adminizer.jwtSecret);
            if (user) {
                // Load user with groups (Sequelize adapter auto-populates associations in _findOne)
                req.user = await adminizer.modelHandler.internal("auth").get("User").findOne({where: {id: user.id}});
            }
        }

        if (req.session.userPretended) {
            req.user = req.session.userPretended;
        }

        if (typeof adminizer.config.translation !== "boolean" && req.i18n?.setLocale) {
            const configuredLocales = adminizer.config.translation?.locales || [];
            const normalizeLocale = (value: unknown): string | null => {
                if (typeof value !== "string") return null;

                const normalized = value.toLowerCase().replace("_", "-");
                const base = normalized.split("-")[0];

                if (configuredLocales.includes(normalized)) return normalized;
                if (configuredLocales.includes(base)) return base;

                return null;
            };

            const preferredLocale =
                normalizeLocale(req.user?.locale) ||
                normalizeLocale((req.user as any)?.language) ||
                normalizeLocale(req.headers["x-locale"]);

            req.i18n.setLocale(preferredLocale || adminizer.config.translation.defaultLocale);
        }

        next();
    };

    // adminizer.app.use('/', bindReqFunctionsF);
    // adminizer.app.use('/*', bindReqFunctionsF);

    adminizer.app.use(bindReqFunctionsF);

    Adminizer.log.info("Adminizer upload loaded");
}
