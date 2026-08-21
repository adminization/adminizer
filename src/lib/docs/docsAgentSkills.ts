import type {Adminizer} from '../Adminizer';
import type {AiAssistantAgentSkill} from '../ai-assistant/AiAssistantAgentSkillHandler';
import type {DocMeta} from './AbstractDocumentation';

function describeMeta(meta: DocMeta): Record<string, unknown> {
    return {
        id: meta.id,
        title: meta.title,
        section: meta.section,
        keywords: meta.keywords.length ? meta.keywords : undefined,
        models: meta.models.length ? meta.models : undefined,
    };
}

/**
 * Documentation skills of the assistant. Every call goes through
 * `DocumentationHandler`, so the agent reads documentation with exactly the
 * permissions of the user it acts for; a document the user may not read does
 * not exist for the agent either. Registered only when the documentation
 * subsystem is enabled.
 */
export function buildDocumentationAgentSkills(adminizer: Adminizer): AiAssistantAgentSkill[] {
    const handler = () => adminizer.documentationHandler;
    const token = adminizer.documentationHandler.baseToken;

    const listKeywords: AiAssistantAgentSkill = {
        id: 'list_documentation_keywords',
        description: 'Map of documentation keywords to the ids of the admin-panel documentation the current user may read.'
            + ' Use it to discover what topics are covered before searching.',
        inputSchema: {type: 'object', properties: {}, additionalProperties: false},
        accessRightsToken: token,
        execute: async (_input, {user}) => {
            const keywords = await handler().keywords(user, handler().localeFor(user));
            return {keywords: Object.fromEntries(keywords)};
        },
    };

    const search: AiAssistantAgentSkill = {
        id: 'search_documentation',
        description: 'Search the admin-panel documentation the current user may read: full-text query, keyword filters,'
            + ' or scoping to an admin URL or a data model. Returns matching documents with snippets;'
            + ' read a whole document with read_documentation.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {type: 'string', description: 'Full-text query matched against titles, keywords and content.'},
                keywords: {
                    type: 'array', items: {type: 'string'},
                    description: 'Keywords the documents must all have, as returned by list_documentation_keywords.',
                },
                url: {type: 'string', description: 'Admin path to scope to, e.g. the page the user is looking at.'},
                model: {type: 'string', description: 'Data model name to scope to.'},
            },
            additionalProperties: false,
        },
        accessRightsToken: token,
        execute: async (input, {user}) => {
            const results = await handler().search(user, {
                query: typeof input.query === 'string' ? input.query : undefined,
                keywords: Array.isArray(input.keywords) ? input.keywords.map(String) : undefined,
                url: typeof input.url === 'string' ? input.url : undefined,
                model: typeof input.model === 'string' ? input.model : undefined,
            }, handler().localeFor(user));
            return {
                results: results.map((result) => ({
                    ...describeMeta(result.meta),
                    snippets: result.snippets.length ? result.snippets : undefined,
                })),
            };
        },
    };

    const read: AiAssistantAgentSkill = {
        id: 'read_documentation',
        description: 'Read one admin-panel documentation document, in the locale of the current user,'
            + ' by the id returned from search_documentation or list_documentation_keywords.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {type: 'string', description: 'Document id.'},
            },
            required: ['id'],
            additionalProperties: false,
        },
        accessRightsToken: token,
        execute: async (input, {user}) => {
            const id = String(input.id ?? '').trim();
            if (!id) throw new Error('id of the document to read is required');
            const content = await handler().get(user, id, handler().localeFor(user));
            if (!content) throw new Error(`Document "${id}" is not available.`);
            return {
                ...describeMeta(content.meta),
                locale: content.locale,
                markdown: content.markdown,
            };
        },
    };

    return [listKeywords, search, read];
}
