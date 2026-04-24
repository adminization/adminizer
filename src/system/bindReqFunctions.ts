import {Adminizer} from "../lib/Adminizer";
import {I18n} from "../lib/I18n";
import {parse} from "cookie";
import {verifyUser} from "../lib/helper/jwt";

export default function bindReqFunctions(adminizer: Adminizer) {

    let bindReqFunctionsF = async function (req: ReqType, res: ResType, next: () => void) {
        /**
         * Add adminizer to use in controllers
         * */
        req.adminizer = adminizer;


        /**
         * Add i18n
         * */
        req.i18n = new I18n({
            locales: adminizer.config.translation !== false ? adminizer.config.translation.locales : [],
            directory: adminizer.config.translation !== false ? adminizer.config.translation.path ?? null : null
        });
        if (res.locals) {
            req.i18n.registerMethods(res.locals, req)
        }

        // NOTE: This is here because inertia should receive data to routes
        // JWT token
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.adminizer_jwt;

        if (token) {
            const user = verifyUser(token, req.adminizer.jwtSecret);
            if (user) {
                // Load user with groups (Sequelize adapter auto-populates associations in _findOne)
                req.user = await req.adminizer.modelHandler.model.get('userap')['_findOne']({id: user.id});
            }
        }

        if (req.session.userPretended) {
            req.user = req.session.userPretended;
        }

        next();
    };

    // adminizer.app.use('/', bindReqFunctionsF);
    // adminizer.app.use('/*', bindReqFunctionsF);

    adminizer.app.use(bindReqFunctionsF);

    Adminizer.log.info("Adminizer upload loaded");
}
