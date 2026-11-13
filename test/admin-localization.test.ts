import {describe, expect, it, vi} from 'vitest';
import inertiaAddHelper from '../src/helpers/inertiaAddHelper';
import {AdminLinkHandler} from '../src/lib/admin-links/AdminLinkHandler';
import {COMMON_UI_TRANSLATION_KEYS} from '../src/lib/ui-i18n/uiTranslationKeys';
import ru from '../src/translations/ru.json';

vi.mock('../src/lib/Adminizer', () => ({Adminizer: {log: {warn: vi.fn()}}}));

const translate = (key: string) => ({Articles: 'Новости', Platform: 'Платформа', Title: 'Заголовок', ...ru}[key] || key);

describe('admin interface localization', () => {
    it('localizes form metadata without translating saved content', async () => {
        const req = {params: {}, i18n: {__: translate}, adminizer: {
            config: {identifierField: 'id'},
            configHelper: {getConfig: () => ({}), isId: () => false},
            menuHelper: {hasGlobalActions: () => false},
        }} as any;
        const props = await inertiaAddHelper(req, {name: 'Articles', uri: '/admin/model/Articles', config: {}} as any, {
            title: {config: {title: 'Title', type: 'string', visible: true}, model: {type: 'string'}},
        } as any, {id: 1, title: 'Title'});
        expect(props.fields[0].label).toBe('Заголовок');
        expect(props.fields[0].value).toBe('Title');
    });

    it('searches localized model actions and retains permission checks', async () => {
        const adminizer = {
            config: {routePrefix: '/admin', models: {
                ArticleModel: {title: 'Articles', navbar: {section: 'Platform'}},
                SecretModel: {title: 'Secret'},
            }},
            accessRightsHelper: {
                checkPermission: async (token: string) => token === 'create-ArticleModel-model',
            },
            menuHelper: {getMenuItems: () => []},
            catalogHandler: {getAll: () => []},
        } as any;
        const handler = new AdminLinkHandler(adminizer);
        adminizer.adminLinkHandler = handler;
        const results = await handler.search({id: 1} as any, 'создать', translate);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({id: 'model-ArticleModel-add', title: 'Новости: создать запись', section: 'Платформа'});
        expect(results[0].description).toBe('Открыть форму создания записи «Новости».');
        expect((await handler.search({id: 1} as any, 'create'))[0].title).toBe('Articles: create record');
    });

    it('shares translated list counters and edit hints with the browser', () => {
        for (const key of ['Showing {from} - {to} of {total}', 'Double-click to edit', 'Event', 'User', 'Diff', 'Created', 'Updated', 'Deleted', 'Restored', 'Read', 'created', 'updated', 'deleted', 'restored', 'read']) {
            expect(COMMON_UI_TRANSLATION_KEYS).toContain(key);
            expect(translate(key)).not.toBe(key);
        }
        expect(translate('Showing {from} - {to} of {total}').replace('{from}', '0').replace('{to}', '0').replace('{total}', '0')).toBe('Показано 0–0 из 0');
    });
});
