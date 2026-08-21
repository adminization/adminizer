import fs from "fs";
import path from "node:path";

let cachedVersion: string | null = null;

/**
 * Adminizer package version. Some built entries keep stable file names because
 * they are imported by a hard-coded path and so cannot be looked up in the
 * manifest (agent.es.js, controls/*.es.js and controls/*.css); for those this
 * version is appended as a query string to invalidate browser caches on release.
 *
 * Only ever put this on a *self-contained* bundle. An entry whose split chunks
 * import it back by name (app.js) must be content-hashed instead — a query
 * string there makes the browser instantiate the module twice.
 */
export function getAssetVersion(): string {
    if (cachedVersion !== null) {
        return cachedVersion;
    }
    let version = "";
    // Compiled sources sit one level below the package root in the published
    // package (helpers/) and two below it in the repo (dist/helpers/).
    for (const candidate of ["../package.json", "../../package.json"]) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, candidate), "utf-8"));
            if (pkg?.name === "adminizer" && typeof pkg.version === "string") {
                version = pkg.version;
                break;
            }
        } catch {
            // Missing or unreadable package.json: try the next candidate.
        }
    }
    cachedVersion = version;
    return version;
}

/** Appends ?v=<version> to a production asset URL; dev URLs pass through untouched. */
export function withAssetVersion(url: string): string;
export function withAssetVersion(url: string | undefined): string | undefined;
export function withAssetVersion(url: string | undefined): string | undefined {
    const version = getAssetVersion();
    if (!url || !version || process.env.ADMINIZER_ENV === "dev") {
        return url;
    }
    return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}
