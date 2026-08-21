import {resolveModelResource} from '../../helpers/modelResourceHelper';
import {getUiTranslations} from '../../lib/ui-i18n/getUiTranslations';
import {DOCS_UI_TRANSLATION_KEYS} from '../../lib/ui-i18n/uiTranslationKeys';
import type {DocMeta} from '../../lib/docs/AbstractDocumentation';
import {DataAccessor} from '../../lib/DataAccessor';

/**
 * Thin JSON proxy of the documentation subsystem: policies have checked the
 * auth and the base token, `DocumentationHandler` applies per-document rights,
 * the implementation does the actual work. No logic lives here.
 */

function requestedLocale(req: ReqType): string | undefined {
    const locale = typeof req.query.locale === 'string' ? req.query.locale.trim() : '';
    return locale || req.adminizer.documentationHandler.localeFor(req.user);
}

function describeMeta(meta: DocMeta): Record<string, unknown> {
    return {
        id: meta.id,
        title: meta.title,
        section: meta.section,
        keywords: meta.keywords,
        models: meta.models,
        urls: meta.urls,
        locales: meta.locales,
    };
}

export async function docsList(req: ReqType, res: ResType) {
    const documents = await req.adminizer.documentationHandler.list(req.user, requestedLocale(req));
    return res.json({documents: documents.map(describeMeta)});
}

export async function docsKeywords(req: ReqType, res: ResType) {
    const keywords = await req.adminizer.documentationHandler.keywords(req.user, requestedLocale(req));
    return res.json({keywords: Object.fromEntries(keywords)});
}

export async function docsSearch(req: ReqType, res: ResType) {
    const keywords = typeof req.query.keywords === 'string'
        ? req.query.keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean)
        : undefined;
    const results = await req.adminizer.documentationHandler.search(req.user, {
        query: typeof req.query.q === 'string' ? req.query.q : undefined,
        keywords,
        url: typeof req.query.url === 'string' ? req.query.url : undefined,
        model: typeof req.query.model === 'string' ? req.query.model : undefined,
    }, requestedLocale(req));
    return res.json({
        results: results.map((result) => ({...describeMeta(result.meta), snippets: result.snippets})),
    });
}

export async function docsContext(req: ReqType, res: ResType) {
    const documents = await req.adminizer.documentationHandler.forContext(req.user, {
        url: typeof req.query.url === 'string' ? req.query.url : undefined,
        model: typeof req.query.model === 'string' ? req.query.model : undefined,
    }, requestedLocale(req));
    return res.json({documents: documents.map(describeMeta)});
}

export async function docsDoc(req: ReqType, res: ResType) {
    const content = await req.adminizer.documentationHandler.get(
        req.user,
        String(req.params.id ?? ''),
        requestedLocale(req),
    );
    // A document the user may not read does not exist for them.
    if (!content) {
        return res.status(404).json({error: req.i18n?.__('Not found') || 'Not found'});
    }
    return res.json({meta: describeMeta(content.meta), markdown: content.markdown, locale: content.locale});
}

/**
 * Resolves references written inside a document to document ids. How a
 * reference is spelled is the implementation's business; the viewer only
 * learns which of them point at a document this user may open — the rest stay
 * unresolved and are rendered as plain text.
 */
export async function docsResolve(req: ReqType, res: ResType) {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    // `refs` is the comma-separated form the viewer uses; repeated `ref`
    // parameters are accepted as well for hand-written calls.
    const raw = req.query.ref;
    const refs = [
        ...(typeof req.query.refs === 'string' ? req.query.refs.split(',') : []),
        ...(Array.isArray(raw) ? raw : [raw]),
    ]
        .filter((ref): ref is string => typeof ref === 'string' && ref.trim() !== '')
        .map((ref) => ref.trim());

    const resolved: Record<string, string> = {};
    for (const ref of refs) {
        const id = await req.adminizer.documentationHandler.resolveLink(req.user, from, ref);
        if (id) resolved[ref] = id;
    }
    return res.json({resolved});
}

/**
 * The viewer page. The document itself is fetched by the page through the API,
 * so a deep link only has to name the document it opens with.
 */
export async function docsPage(req: ReqType) {
    return req.Inertia.render({
        component: 'docs',
        props: {
            title: req.i18n.__('Documentation'),
            docId: typeof req.params.id === 'string' ? req.params.id : null,
            i18nPage: getUiTranslations(req, DOCS_UI_TRANSLATION_KEYS),
        },
    });
}

/**
 * Structure of a model resource as this user is allowed to see it — the same
 * fields DataAccessor would hand to the list page, nothing more.
 */
export async function docsSchema(req: ReqType, res: ResType) {
    const name = typeof req.query.model === 'string' ? req.query.model.trim() : '';
    const resource = name ? resolveModelResource(req.adminizer, name) : undefined;
    if (!resource) {
        return res.status(404).json({error: req.i18n.__('Model not found')});
    }
    if (!await req.adminizer.accessRightsHelper.hasPermission(`read-${resource.name}-model`, req.user)) {
        return res.status(403).json({error: req.i18n.__('Access denied')});
    }

    const fields = new DataAccessor(req.adminizer, req.user, resource, 'list').getFieldsConfig() ?? {};
    return res.json({
        model: resource.name,
        title: req.i18n.__(resource.config?.title ?? resource.name),
        url: resource.uri,
        fields: Object.entries(fields).map(([key, field]) => ({
            name: key,
            title: field.config?.title ? req.i18n.__(field.config.title) : key,
            type: String(field.config?.type ?? field.model?.type ?? 'string'),
            required: Boolean(field.config?.required ?? field.model?.required),
        })),
    });
}
