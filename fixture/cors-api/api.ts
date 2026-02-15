import {Adminizer, verifyUser, signUser} from "../../dist";
import {parse, serialize} from "cookie";
import {UserAP} from "../../dist";

export function corsApi(adminizer: Adminizer) {
    const routePrefix = adminizer.config.routePrefix || '';
    const frontendJwtSecret = process.env.FRONTEND_JWT_SECRET || 'frontend-secret';

    // Endpoint for receiving a CSRF token
    adminizer.app.get(`${routePrefix}/api/csrf-token`, (req: any, res: any) => {
        // Inertia middleware has already set the token in cookies
        // We're just returning it in the response for convenience.
        const csrfToken = req.cookies['XSRF-TOKEN'];
        res.json({
            csrfToken,
            cookieName: 'XSRF-TOKEN',
            headerName: 'x-xsrf-token'
        });
    });

    adminizer.app.get(`${routePrefix}/api/auth/check`, (req: any, res: any) => {
        const cookies = parse(req.headers.cookie || '');
        const frontendToken = cookies.frontend_jwt;

        let frontendUser: UserAP = null;

        if (frontendToken) {
            try {
                frontendUser = verifyUser(frontendToken, frontendJwtSecret);
            } catch (e) {
                console.log('Invalid frontend token');
            }
        }

        if (frontendUser) {
            console.log('🔐  Frontend auth check: AUTHORIZED');
            return res.json({
                auth: true,
                user: {
                    id: frontendUser.id,
                    email: frontendUser.email,
                    name: frontendUser.fullName
                }
            });
        } else {
            console.log('🔐  Frontend auth check: UNAUTHORIZED');
            return res.status(401).json({
                auth: false,
                message: 'Not authenticated'
            });
        }
    });

    adminizer.app.post(`${routePrefix}/api/auth/login`, async (req: any, res: any) => {
        try {
            const {login, password} = req.body;
            const user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({login: login}) as UserAP;

            const token = signUser(user, frontendJwtSecret);

            res.setHeader('Set-Cookie', serialize('frontend_jwt', token, {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 * 2, // 2 weeks
            }));

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    login: user.login,
                    id: user.id,
                    name: user.fullName
                }
            });

        } catch (e) {
            console.log('Login error:', e);
            res.status(401).json({
                success: false,
                message: 'Login failed'
            });
        }
    });
}