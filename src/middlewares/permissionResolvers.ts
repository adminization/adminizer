function extractEntityName(req: ReqType): string | undefined {
    if (req.params?.entityName) {
        return req.params.entityName;
    }

    if (req.params?.entity) {
        return req.params.entity;
    }

    const path = req.path || req.originalUrl || "";
    const match = path.match(/\/(?:model|form)\/([^/]+)/i);
    return match?.[1];
}

export const GROUP_FILTER_VISIBILITY_TOKEN = "manage-group-filter-visibility";

export function modelReadToken(req: ReqType): string | undefined {
    const entityName = extractEntityName(req);
    return entityName ? `read-${entityName}-model` : undefined;
}

export function modelCreateToken(req: ReqType): string | undefined {
    const entityName = extractEntityName(req);
    return entityName ? `create-${entityName}-model` : undefined;
}

export function modelUpdateToken(req: ReqType): string | undefined {
    const entityName = extractEntityName(req);
    return entityName ? `update-${entityName}-model` : undefined;
}

export function modelDeleteToken(req: ReqType): string | undefined {
    const entityName = extractEntityName(req);
    return entityName ? `delete-${entityName}-model` : undefined;
}

export function formUpdateToken(req: ReqType): string | undefined {
    const slug = req.params?.slug;
    return slug ? `update-${slug}-form` : undefined;
}

export function formCreateToken(req: ReqType): string | undefined {
    const entityName = extractEntityName(req);
    return entityName ? `create-${entityName}-form` : undefined;
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

    const id = req.params?.id;
    return id ? `catalog-${slug}-${id}` : `catalog-${slug}`;
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

export function historyToken(req: ReqType): string {
    return `history-${req.adminizer.config.history?.adapter ?? "default"}`;
}

export function groupFilterVisibilityToken(): string {
    return GROUP_FILTER_VISIBILITY_TOKEN;
}
