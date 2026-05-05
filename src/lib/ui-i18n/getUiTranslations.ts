export function getUiTranslations(req: ReqType, keys: readonly string[]): Record<string, string> {
    return Object.fromEntries(keys.map((key) => [key, req.i18n.__(key)]));
}
