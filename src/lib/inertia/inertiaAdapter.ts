import {RequestHandler, Response, Request} from 'express';
import {randomBytes} from 'crypto';

type props = Record<string | number | symbol, unknown>;

export type Options = {
    readonly enableReload?: boolean;
    readonly version: string;
    readonly html: (page: Page, viewData: props) => string;
    readonly flashMessages?: (req: Request) => props;
    readonly csrf?: {
        enabled: boolean;
        cookieName?: string;
        headerName?: string;
    };
};

export type Page = {
    readonly component: string;
    props: props;
    readonly url?: string;
    readonly version?: string;
};
export type Inertia = {
    readonly setViewData: (viewData: props) => Inertia;
    readonly shareProps: (sharedProps: props) => Inertia;
    readonly setStatusCode: (statusCode: number) => Inertia;
    readonly setHeaders: (headers: Record<string, string>) => Inertia;
    readonly render: (Page: Page) => Promise<Response>;
    readonly redirect: (url: string) => Response;
};
export const headers = {
    xInertia: 'x-inertia',
    xInertiaVersion: 'x-inertia-version',
    xInertiaLocation: 'x-inertia-location',
    xInertiaPartialData: 'x-inertia-partial-data',
    xInertiaPartialComponent: 'x-inertia-partial-component',
    xInertiaCurrentComponent: 'x-inertia-current-component',
};

const inertiaExpressAdapter: (options: Options) => RequestHandler = function (
    {
        version,
        html,
        flashMessages,
        enableReload = false,
        csrf = {enabled: false}, // by default disabled
    }) {
    return (req: ReqType, res, next) => {

        if (csrf.enabled) {
            const isApiRoute = isApiRequest(req);

            if (!isApiRoute) {
                const csrfToken = randomBytes(32).toString('hex');

                res.cookie('XSRF-TOKEN', csrfToken, {
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production' && process.env.CSRF_COOKIE_INSECURE !== '1',
                    sameSite: 'lax',
                });

                // Checking CSRF only for non-GET requests AND non-API routes
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    const csrfCookie = req.cookies['XSRF-TOKEN'];
                    const csrfHeader = req.headers[csrf.headerName || 'x-xsrf-token'];

                    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
                        return res.status(403).json({
                            message: 'Invalid CSRF token',
                            type: 'csrf_error'
                        });
                    }
                }
            }
        }

        if (
            req.method === 'GET' &&
            req.headers[headers.xInertia] &&
            req.headers[headers.xInertiaVersion] !== version
        ) {
            req.session.destroy(() => {
                res.writeHead(409, {[headers.xInertiaLocation]: req.url}).end();
            });
            return;
        }

        let _viewData = {};
        let _sharedProps: props = {};
        let _statusCode = 200;
        let _headers: Record<string, string | string[] | undefined> = {};

        const Inertia: Inertia = {
            setViewData(viewData) {
                _viewData = viewData;
                return this;
            },

            shareProps(sharedProps) {
                _sharedProps = {..._sharedProps, ...sharedProps};
                return this;
            },

            setStatusCode(statusCode) {
                _statusCode = statusCode;
                return this;
            },

            setHeaders(headers) {
                _headers = {...req.headers, ..._headers, ...headers};
                return this;
            },
            async render({props, ...pageRest}) {
                const _page: Page = {
                    ...pageRest,
                    url: req.originalUrl || req.url,
                    version,
                    props,
                };
                if (flashMessages) {
                    this.shareProps(flashMessages(req));
                }
                if (enableReload) {
                    req.session.xInertiaCurrentComponent = pageRest.component;
                }
                const allProps = {..._sharedProps, ...props};

                let dataKeys;
                const partialDataHeader = req.headers[headers.xInertiaPartialData];
                if (
                    partialDataHeader &&
                    req.headers[headers.xInertiaPartialComponent] === _page.component &&
                    typeof partialDataHeader === 'string'
                ) {
                    dataKeys = partialDataHeader.split(',');
                } else {

                    dataKeys = Object.keys(allProps);
                }

                // we need to clear the props object on each call
                const propsRecord: props = {};
                for await (const key of dataKeys) {
                    let value;
                    if (typeof allProps[key] === 'function') {
                        value = await (allProps[key] as () => unknown)();
                    } else {
                        value = allProps[key];
                    }
                    propsRecord[key] = value;
                }
                _page.props = propsRecord;

                if (req.headers[headers.xInertia]) {

                    res
                        .status(_statusCode)
                        .set({
                            // ...req.headers,
                            ..._headers,
                            'Content-Type': 'application/json',
                            [headers.xInertia]: 'true',
                            Vary: 'Accept',
                        })
                        .send(JSON.stringify(_page));
                } else {
                    res
                        .status(_statusCode)
                        .set({
                            ...req.headers,
                            ..._headers,
                            'Content-Type': 'text/html',
                        })
                        .send(html(_page, _viewData));
                }
                return res;
            },

            redirect(url) {
                const statusCode = ['PUT', 'PATCH', 'DELETE'].includes(req.method)
                    ? 303
                    : 302;
                res.redirect(statusCode, url);
                return res;
            },
        };


        req.Inertia = Inertia;

        return next();
    };
};

// Helper function for defining API routes
function isApiRequest(req: ReqType): boolean {
    const adminizer = req.adminizer;

    if (!adminizer?.config?.cors?.enabled) {
        return false;
    }

    const corsConfig = adminizer.config.cors;
    const routePrefix = adminizer.config.routePrefix || '';

    // Create a base path for the API
    const apiBasePath = `${routePrefix}/${corsConfig.path?.replace('*', '')}`;

    // Checking if the path starts with API base path
    return req.path.startsWith(apiBasePath);
}

export default inertiaExpressAdapter;
