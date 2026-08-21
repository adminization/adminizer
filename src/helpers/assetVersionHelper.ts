import fs from "fs";
import path from "node:path";

let cachedVersion: string | null = null;

/**
 * Adminizer package version. Built entry assets keep stable file names
 * (app.js, agent.es.js, controls/*.es.js and controls/*.css), so this version
 * is appended as a query string to invalidate browser caches on release.
 */
export function getAssetVersion(): string {
    if (cachedVersion !== null) {
        return cachedVersion;
    }
    let version = "";
    try {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../../package.json"), "utf-8"));
        version = typeof pkg.version === "string" ? pkg.version : "";
    } catch {
        // Missing or unreadable package.json: fall back to an empty version.
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
