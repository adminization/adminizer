import {routePrefix} from "../../adminizerConfig";
import type {NavigationAppConfig} from "./NavigationTypes";

export const navigationAppConfig: NavigationAppConfig = {
    routePrefix,
    items: [
        {
            title: "Category",
            model: "Category",
            urlPath: "/catalog/category/${data.record.slug}",
        },
        {
            title: "Example",
            model: "Example",
            urlPath: `${routePrefix}/model/Example/\${data.record.id}`,
        },
    ],
    sections: ["header", "footer"],
    groupField: [
        {
            name: "link",
            label: "Ссылка",
            required: false,
        },
        {
            name: "test_field",
            label: "Test",
            required: false,
        },
        {
            name: "test_feild2",
            label: "Test2",
            required: false,
        },
    ],
};
