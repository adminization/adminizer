import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {resolveAdminHref} from "../src/assets/js/ai-assistant/agent/runtime";

/** The helper only reads `window.routePrefix` and `window.location`. */
function stubWindow(routePrefix: string, host = "localhost:1337") {
    (globalThis as any).window = {
        routePrefix,
        location: {protocol: "http:", host, hostname: host.replace(/:\d+$/, "")},
    };
}

describe("resolveAdminHref", () => {
    beforeEach(() => stubWindow("/admin"));
    afterEach(() => { delete (globalThis as any).window; });

    it("keeps an admin path as a same-origin path", () => {
        expect(resolveAdminHref("/admin/model/Test/edit/1"))
            .toEqual({href: "/admin/model/Test/edit/1", internal: true});
    });

    it("drops a guessed origin, so the current port is kept", () => {
        expect(resolveAdminHref("http://localhost/admin/model/Test/edit/1"))
            .toEqual({href: "/admin/model/Test/edit/1", internal: true});
        expect(resolveAdminHref("//localhost/admin/model/Test"))
            .toEqual({href: "/admin/model/Test", internal: true});
    });

    it("adds the route prefix when the agent omits it", () => {
        expect(resolveAdminHref("/model/Test/edit/1"))
            .toEqual({href: "/admin/model/Test/edit/1", internal: true});
        expect(resolveAdminHref("model/Test?page=2"))
            .toEqual({href: "/admin/model/Test?page=2", internal: true});
    });

    it("keeps a link of this host internal even without port and prefix", () => {
        expect(resolveAdminHref("http://localhost/model/Test/edit/1"))
            .toEqual({href: "/admin/model/Test/edit/1", internal: true});
        expect(resolveAdminHref("http://localhost:9999/admin/model/Test"))
            .toEqual({href: "/admin/model/Test", internal: true});
    });

    it("leaves foreign sites, mail links and anchors untouched", () => {
        expect(resolveAdminHref("https://example.com/docs"))
            .toEqual({href: "https://example.com/docs", internal: false});
        expect(resolveAdminHref("mailto:ops@example.com"))
            .toEqual({href: "mailto:ops@example.com", internal: false});
        expect(resolveAdminHref("#section"))
            .toEqual({href: "#section", internal: false});
    });

    it("treats any path of the current origin as internal without a prefix", () => {
        stubWindow("");
        expect(resolveAdminHref("http://localhost:1337/model/Test"))
            .toEqual({href: "/model/Test", internal: true});
        expect(resolveAdminHref("https://example.com/model/Test"))
            .toEqual({href: "https://example.com/model/Test", internal: false});
    });
});
