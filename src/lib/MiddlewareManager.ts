import * as fs from "fs";
import * as path from "path";
import {Adminizer} from "./Adminizer";
import {pathToFileURL} from "url";

class MiddlewareManager {
    private readonly _adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this._adminizer = adminizer;
    }

    async loadMiddlewares() {
        try {
            const middlewaresDirPath = path.join(import.meta.dirname, "../middlewares");
            const middlewaresDir = fs.readdirSync(middlewaresDirPath);
            for (const middlewareFile of middlewaresDir) {
                if (path.extname(middlewareFile).toLowerCase() === ".js") {
                    const middlewarePath = path.join(middlewaresDirPath, middlewareFile);
                    const middleware = (await import(pathToFileURL(middlewarePath).href)).default;
                    if (
                        typeof middleware === "function" &&
                        Array.isArray(this._adminizer.config.middlewares)
                    ) {
                        this._adminizer.config.middlewares.push(middleware);
                    } else {
                        Adminizer.log.error(
                            `Adminizer > Middleware ${middlewareFile} is not a function`
                        );
                    }
                }
            }

            Adminizer.log.info("Adminizer middlewares loaded")
        } catch (e) {
            
            Adminizer.log.error("Adminizer > Could not load middlewares", e);
        }
    }

    bindMiddlewares(middleware: MiddlewareType[], action: MiddlewareType): MiddlewareType[] {
        const result = [];

        const bindMiddleware = (middleware: MiddlewareType) => {
            if (typeof middleware === "function") {
                result.push(middleware);
            } else {
                Adminizer.log.error(
                    "AdminPanel: Middleware format unknown: " + middleware
                );
            }
        };

        if (Array.isArray(middleware)) {
            middleware.forEach(bindMiddleware);
        } else {
            bindMiddleware(middleware);
        }

        result.push(action);
        return result;
    }
}

export default MiddlewareManager;
