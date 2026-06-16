import {afterEach, describe, expect, it, vi} from "vitest";
import {createAdminizerLogger} from "../src/lib/Adminizer";
import type winston from "winston";

const {mkdirSync} = vi.hoisted(() => ({
    mkdirSync: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => ({
    ...await importOriginal<typeof import("fs")>(),
    mkdirSync,
}));

describe("adminizer logger", () => {
    const previousLogToFile = process.env.ADMINIZER_LOG_TO_FILE;

    afterEach(() => {
        if (previousLogToFile === undefined) {
            delete process.env.ADMINIZER_LOG_TO_FILE;
        } else {
            process.env.ADMINIZER_LOG_TO_FILE = previousLogToFile;
        }

        mkdirSync.mockReset();
        vi.restoreAllMocks();
    });

    it("does not log to file or create the log directory by default", () => {
        delete process.env.ADMINIZER_LOG_TO_FILE;
        const logger = createAdminizerLogger();

        try {
            expect(findFileTransport(logger)).toBeUndefined();
            expect(mkdirSync).not.toHaveBeenCalled();
        } finally {
            logger.close();
        }
    });

    it("logs to the hardcoded file when ADMINIZER_LOG_TO_FILE is enabled", () => {
        process.env.ADMINIZER_LOG_TO_FILE = "true";
        const logger = createAdminizerLogger();

        try {
            const fileTransport = findFileTransport(logger);

            expect(fileTransport).toBeDefined();
            expect((fileTransport as any).dirname).toBe("logs");
            expect((fileTransport as any).filename).toBe("app.log");
            expect(mkdirSync).toHaveBeenCalledWith("logs", {recursive: true});
        } finally {
            logger.close();
        }
    });
});

function findFileTransport(logger: winston.Logger): winston.transport | undefined {
    return logger.transports.find((transport) => (
        transport.constructor.name === "File" || (transport as any).name === "file"
    ));
}
