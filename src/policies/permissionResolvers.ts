function extractModelResourceName(req: ReqType): string | undefined {
    if (req.params?.modelResourceName) {
        return req.params.modelResourceName;
    }

    const path = req.path || req.originalUrl || "";
    const match = path.match(/\/model\/([^/]+)/i);
    return match?.[1];
}

export const GROUP_FILTER_VISIBILITY_TOKEN = "manage-group-filter-visibility";

export function modelReadToken(req: ReqType): string | undefined {
    const modelResourceName = extractModelResourceName(req);
    return modelResourceName ? `read-${modelResourceName}-model` : undefined;
}

export function modelCreateToken(req: ReqType): string | undefined {
    const modelResourceName = extractModelResourceName(req);
    return modelResourceName ? `create-${modelResourceName}-model` : undefined;
}

export function modelUpdateToken(req: ReqType): string | undefined {
    const modelResourceName = extractModelResourceName(req);
    return modelResourceName ? `update-${modelResourceName}-model` : undefined;
}

export function modelDeleteToken(req: ReqType): string | undefined {
    const modelResourceName = extractModelResourceName(req);
    return modelResourceName ? `delete-${modelResourceName}-model` : undefined;
}

export function widgetToken(req: ReqType): string | undefined {
    const widgetId = req.params?.widgetId;
    return widgetId ? `widget-${widgetId}` : undefined;
}

export function widgetsToken(): string {
    return "widgets";
}

export function catalogToken(req: ReqType): string | undefined {
    const slug = req.params?.slug;
    if (!slug) return undefined;
    return `catalog-${slug}`;
}

export function mediaManagerToken(req: ReqType): string | undefined {
    const id = req.params?.id;
    return id ? `mediaManager-${id}` : undefined;
}

export function aiModelToken(req: ReqType): string | undefined {
    const modelId =
        req.params?.modelId || (typeof req.body?.modelId === "string" ? req.body.modelId : undefined);
    return modelId ? `ai-assistant-${modelId}` : undefined;
}

export function documentationToken(req: ReqType): string {
    return req.adminizer.documentationHandler.baseToken;
}

export function historyToken(req: ReqType): string {
    return `history-${req.adminizer.config.history?.adapter ?? "default"}`;
}

export function groupFilterVisibilityToken(): string {
    return GROUP_FILTER_VISIBILITY_TOKEN;
}


