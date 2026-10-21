import express from "express";
import type {AddressInfo} from "net";
import {afterEach, describe, expect, it} from "vitest";
import bindExpressUtils from "../src/system/bindExpressUtils";

/** Posts `size` bytes of JSON to an app wired the way Adminizer wires its own. */
async function post(size: number, bodyLimit?: string | number) {
    const app = express();
    bindExpressUtils(app, {bodyLimit});
    app.post("/echo", (req, res) => res.json({length: String(req.body?.content ?? "").length}));
    app.use((error: {status?: number}, _req: unknown, res: express.Response, _next: unknown) => {
        res.status(error.status ?? 500).json({error: "refused"});
    });

    const server = await new Promise<import("http").Server>((resolve) => {
        const listening = app.listen(0, () => resolve(listening));
    });
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/echo`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({content: "a".repeat(size)}),
    });
    return {status: response.status, body: await response.json()};
}

const servers: import("http").Server[] = [];
afterEach(() => {
    for (const server of servers.splice(0)) server.close();
});

describe("request body limit", () => {
    it("keeps body-parser's 100kb when none is configured", async () => {
        expect((await post(50_000)).status).toBe(200);
        expect((await post(200_000)).status).toBe(413);
    });

    it("takes a limit written as a size", async () => {
        const result = await post(5_000_000, "20mb");
        expect(result.status).toBe(200);
        expect(result.body.length).toBe(5_000_000);
    });

    it("takes a limit written in bytes", async () => {
        expect((await post(300_000, 1_000_000)).status).toBe(200);
    });

    it("still refuses what is over the limit that was set", async () => {
        expect((await post(2_000_000, "1mb")).status).toBe(413);
    });
});
