import {afterEach, describe, expect, it, vi} from "vitest";
import {Adminizer} from "../src/lib/Adminizer";

describe("Adminizer async events", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("logs listener context and rethrows listener errors", async () => {
        const adminizer = new Adminizer([]);
        const logSpy = vi.spyOn(Adminizer.logger, "error").mockImplementation(() => Adminizer.logger);

        async function failingListener() {
            throw new Error("Listener failed");
        }

        adminizer.emitter.on("test:failed", failingListener);

        await expect(adminizer.emitAsync("test:failed", {})).rejects.toThrow("Listener failed");
        expect(logSpy).toHaveBeenCalledWith(
            "Async event listener failed",
            expect.objectContaining({
                event: "test:failed",
                listener: "failingListener",
                listenerIndex: 0,
                timeoutMs: 10_000,
                error: "Listener failed",
            }),
        );
    });

    it("rejects and logs when a listener exceeds its timeout", async () => {
        vi.useFakeTimers();

        const adminizer = new Adminizer([]);
        const logSpy = vi.spyOn(Adminizer.logger, "error").mockImplementation(() => Adminizer.logger);

        async function slowListener() {
            await new Promise(() => undefined);
        }

        adminizer.emitter.on("test:timeout", slowListener);

        const emission = adminizer.emitAsync("test:timeout", {}, {timeoutMs: 25});
        const rejection = expect(emission).rejects.toThrow(
            'Listener "slowListener" for event "test:timeout" timed out after 25 ms',
        );

        await vi.advanceTimersByTimeAsync(25);
        await rejection;

        expect(logSpy).toHaveBeenCalledWith(
            "Async event listener failed",
            expect.objectContaining({
                event: "test:timeout",
                listener: "slowListener",
                listenerIndex: 0,
                timeoutMs: 25,
            }),
        );
    });
});
