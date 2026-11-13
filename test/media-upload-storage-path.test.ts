import { describe, expect, it } from "vitest";
import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import sharp from "sharp";
import { MediaManagerAdapter } from "../src/controllers/media-manager/mediaManagerAdapter";

describe("media upload storage paths", () => {
    it.each(["absolute", "relative"])("writes multipart PNGs and variants into the configured %s storage", async (kind) => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "adminizer-upload-"));
        const storage = path.join(directory, "images");
        const fileStoragePath = kind === "absolute" ? storage : path.relative(process.cwd(), storage);
        const bytes = await sharp({ create: { width: 8, height: 6, channels: 3, background: "#2468ac" } }).png().toBuffer();
        let server: Server | undefined;
        const uploaded: string[] = [];
        try {
            const manager = {
                id: "default", fileStoragePath, urlPathPrefix: "media",
                async upload(file: Express.Multer.File, filename: string) {
                    const destination = path.resolve(storage, "media", filename);
                    // The media manager reads the configured path, not multer's temporary path.
                    expect(path.resolve(file.path)).toBe(destination);
                    expect(await fs.readFile(destination)).toEqual(bytes);
                    const metadata = await sharp(destination).metadata();
                    uploaded.push(destination);
                    return [{ id: filename, path: destination, width: metadata.width, height: metadata.height }];
                },
                async uploadVariant(_item: unknown, file: Express.Multer.File, filename: string) {
                    return (await this.upload(file, filename))[0];
                },
            };
            const adapter = new MediaManagerAdapter(manager as any);
            const app = express();
            app.use((req: any, _res, next) => {
                req.adminizer = { config: { mediamanager: { maxByteSize: 1024 * 1024, allowMIME: ["image/*"] } } };
                req.i18n = { __: (value: string) => value };
                next();
            });
            app.post("/upload", (req, res) => adapter.upload(req as any, res as any));
            app.post("/variant", (req, res) => adapter.uploadVariant(req as any, res as any));
            server = app.listen(0, "127.0.0.1");
            await new Promise<void>((resolve, reject) => { server!.once("listening", resolve); server!.once("error", reject); });
            const address = server.address();
            if (!address || typeof address === "string") throw new Error("Missing fixture address");
            for (const route of ["upload", "variant"]) {
                const form = new FormData();
                form.set("name", "fixture.png");
                if (route === "variant") form.set("item", JSON.stringify({ id: "original", mimeType: "image/png" }));
                form.set("file", new Blob([bytes], { type: "image/png" }), "fixture.png");
                const response = await fetch(`http://127.0.0.1:${address.port}/${route}`, { method: "POST", body: form });
                expect(response.status, await response.clone().text()).toBe(200);
                const result = await response.json();
                expect(result.msg).toBe("success");
                const item = route === "upload" ? result.data[0] : result.data;
                expect(item.width).toBe(8);
                expect(item.height).toBe(6);
            }
            expect(uploaded).toHaveLength(2);
            expect((await fs.readdir(path.join(storage, "media"))).length).toBe(2);
        } finally {
            if (server?.listening) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
            await fs.rm(directory, { recursive: true, force: true });
            // Remove only the duplicate temporary directory created by the old absolute-path bug.
            if (kind === "absolute") await fs.rm(path.join(process.cwd(), directory), { recursive: true, force: true });
        }
    });
});
