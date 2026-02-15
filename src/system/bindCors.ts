import {Adminizer} from "../lib/Adminizer";

export function bindCors(adminizer: Adminizer){
    if (adminizer.config?.cors?.enabled) {
        const corsConfig = adminizer.config.cors;

        // We support an array of allowed origins
        const allowedOrigins = Array.isArray(corsConfig.origin)
            ? corsConfig.origin
            : [corsConfig.origin];

        adminizer.app.all(`${adminizer.config.routePrefix}/${corsConfig.path}`, (req: any, res: any, next: any) => {
            const requestOrigin = req.headers.origin;

            // Checking if origin is allowed
            const isOriginAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);

            if (requestOrigin && !isOriginAllowed) {
                console.log(`❌ CORS: Blocked request from ${requestOrigin}`);

                if (req.method === 'OPTIONS') {
                    // For preflight - 200 without CORS headers
                    return res.status(200).end();
                } else {
                    // For basic queries - error
                    return res.status(403).json({
                        error: 'CORS policy: Origin not allowed'
                    });
                }
            }

            // Request from allowed origin or without Origin
            if (isOriginAllowed) {
                // For CORS requests, return the same origin (or the first one from the list)
                const allowOrigin = requestOrigin || allowedOrigins[0];
                res.header('Access-Control-Allow-Origin', allowOrigin);
                res.header('Access-Control-Allow-Credentials',
                    corsConfig.credentials !== false ? 'true' : 'false');
                res.header('Access-Control-Allow-Methods',
                    corsConfig.methods?.join(',') || 'GET,POST,PUT,DELETE,OPTIONS');
                res.header('Access-Control-Allow-Headers',
                    corsConfig.allowedHeaders?.join(',') || 'Content-Type,Authorization,X-Requested-With,X-CSRF-Token,x-xsrf-token');
            }

            if (req.method === 'OPTIONS') {
                return res.status(200).end();
            }

            next();
        });

        console.log('✅ API CORS middleware enabled. Allowed origins:', allowedOrigins);
    }
}
