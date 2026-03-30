import {describe, expect, it} from "vitest";
import {
    detachMediaManagerField,
    normalizeMediaManagerWidgetData,
} from "../src/lib/media-manager/helpers/MediaManagerHelper";

describe("MediaManagerHelper", () => {
    it("normalizes a JSON string payload into widget items", () => {
        const data = normalizeMediaManagerWidgetData(
            JSON.stringify([{id: "file-1", url: "/img/1.jpg"}]),
            "images"
        );

        expect(data).toEqual([{id: "file-1", url: "/img/1.jpg"}]);
    });

    it("keeps an array payload unchanged", () => {
        const payload = [{id: "file-2", filename: "photo.jpg"}];

        const data = normalizeMediaManagerWidgetData(payload, "images");

        expect(data).toBe(payload);
    });

    it("converts an empty payload into an empty relation list", () => {
        expect(normalizeMediaManagerWidgetData("", "images")).toEqual([]);
        expect(normalizeMediaManagerWidgetData(null, "images")).toEqual([]);
    });

    it("moves mediamanager data out of the ORM payload", () => {
        const reqData = {
            images: [{id: "file-3", mimeType: "image/jpeg"}],
            title: "Dish",
        };
        const rawReqData = {...reqData};

        detachMediaManagerField(reqData, rawReqData, "images");

        expect(reqData).toEqual({title: "Dish"});
        expect(rawReqData.images).toEqual([{id: "file-3", mimeType: "image/jpeg"}]);
    });

    it("throws for invalid mediamanager JSON", () => {
        expect(() => normalizeMediaManagerWidgetData("{bad json}", "images")).toThrow(
            "Error assign association-many mediamanager data for images"
        );
    });
});
