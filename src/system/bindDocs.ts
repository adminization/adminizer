import {Adminizer} from '../lib/Adminizer';
import {DOCUMENTATION_DEPARTMENT} from '../lib/docs/DocumentationHandler';
import {buildDocumentationAgentSkills} from '../lib/docs/docsAgentSkills';
import {docsContext, docsDoc, docsKeywords, docsList, docsPage, docsResolve, docsSchema, docsSearch} from '../controllers/docs';
import {requireAuthAPI, requireAuthUI, requirePermission} from '../policies/authPolicies';
import {documentationToken} from '../policies/permissionResolvers';
import {bindWithMiddlewares} from './routePolicies';

/**
 * The single wiring point of the documentation subsystem: the base token, the
 * navigation entries, the assistant skills and the HTTP routes.
 *
 * It is run by `DocumentationHandler.activate()` — at most once, and only when
 * the feature has both of its switches: `config.documentation.enabled` is
 * `true` AND an implementation is registered. Either one missing means none of
 * this exists; the feature is indistinguishable from absent. The implementation
 * arrives after `init()`, so the routes are mounted late — the same way the
 * feedback controller is.
 */
export default function bindDocs(adminizer: Adminizer): void {
    adminizer.accessRightsHelper.registerToken({
        id: adminizer.documentationHandler.baseToken,
        name: 'Documentation',
        description: 'Access to the built-in documentation (knowledge base)',
        department: DOCUMENTATION_DEPARTMENT,
    });

    // The viewer in the navigation, and the per-document page as a template:
    // the assistant discovers both through `list_admin_navigation` and can
    // link a user straight to an article.
    adminizer.adminLinkHandler.add({
        id: 'documentation',
        type: 'page',
        name: 'Documentation',
        title: 'Documentation',
        link: `${adminizer.config.routePrefix}/docs`,
        section: 'Platform',
        accessRightsToken: adminizer.documentationHandler.baseToken,
    });
    adminizer.adminLinkHandler.addTemplate({
        id: 'documentation-article',
        title: 'Documentation article',
        description: 'A single knowledge base article opened in the documentation viewer',
        template: `${adminizer.config.routePrefix}/docs/:id`,
        section: 'Platform',
        accessRightsToken: adminizer.documentationHandler.baseToken,
        params: [{name: 'id', description: 'Document id as returned by the documentation skills'}],
    });

    // The assistant and the documentation are independent: skills are just
    // registered; whether an agent picks them up is the assistant's business.
    for (const skill of buildDocumentationAgentSkills(adminizer)) {
        adminizer.aiAssistantAgentSkillHandler.add(skill);
    }

    /**
     * HTTP routes — a thin proxy over DocumentationHandler. Mounted routes
     * cannot be unmounted, so after a runtime `unregister()` the API answers
     * the same `404` an unknown path gets, not a 500.
     */
    const requireDocsService: MiddlewareType = (req, res, next) => {
        if (!req.adminizer.documentationHandler.isRegistered()) {
            return res.status(404).json({error: req.i18n?.__('Not found') || 'Not found'});
        }
        return next();
    };

    const middlewares = adminizer.config.middlewares ?? [];
    const route = (action: MiddlewareType, ...policies: MiddlewareType[]) =>
        bindWithMiddlewares(adminizer, middlewares, action, policies);
    const prefix = adminizer.config.routePrefix;

    adminizer.app.get(
        `${prefix}/docs/api/list`,
        route(docsList, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );
    adminizer.app.get(
        `${prefix}/docs/api/keywords`,
        route(docsKeywords, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );
    adminizer.app.get(
        `${prefix}/docs/api/search`,
        route(docsSearch, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );
    adminizer.app.get(
        `${prefix}/docs/api/context`,
        route(docsContext, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );
    adminizer.app.get(
        `${prefix}/docs/api/doc/:id`,
        route(docsDoc, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );
    adminizer.app.get(
        `${prefix}/docs/api/resolve`,
        route(docsResolve, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );
    adminizer.app.get(
        `${prefix}/docs/api/schema`,
        route(docsSchema, requireDocsService, requireAuthAPI(), requirePermission(documentationToken))
    );

    // The viewer itself; registered after the API so that `/docs/api/...`
    // never falls into `/docs/:id`. Without a service the page renders an
    // empty knowledge base — the API behind it answers 404.
    adminizer.app.get(
        `${prefix}/docs`,
        route(docsPage, requireAuthUI(), requirePermission(documentationToken, {mode: 'ui'}))
    );
    adminizer.app.get(
        `${prefix}/docs/:id`,
        route(docsPage, requireAuthUI(), requirePermission(documentationToken, {mode: 'ui'}))
    );
}
