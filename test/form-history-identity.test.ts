import {describe, expect, it, vi} from 'vitest';
import inertiaAddHelper from '../src/helpers/inertiaAddHelper';

vi.mock('../src/lib/Adminizer', () => ({Adminizer: {log: {warn: vi.fn()}}}));

function fixture(identifierField = 'id') {
    const req = {
        params: {},
        i18n: {__: (key: string) => key},
        adminizer: {
            config: {identifierField},
            configHelper: {getConfig: () => ({showORMtime: false})},
            menuHelper: {hasGlobalActions: () => false},
        },
    } as any;
    const resource = {name: 'PageModel', uri: '/admin/model/PageModel', config: {identifierField}} as any;
    return {req, resource};
}

describe('form history record identity', () => {
    it('includes the record ID when no ID field is rendered', async () => {
        const {req, resource} = fixture();
        const props = await inertiaAddHelper(req, resource, {}, {id: 84, title: 'Page'});
        expect(props.fields).toEqual([]);
        expect(props.recordId).toBe('84');
        expect(props.postLink).toBe('/admin/model/PageModel/edit/84');
    });

    it('uses the configured identifier for UUID-backed resources', async () => {
        const {req, resource} = fixture('uuid');
        const props = await inertiaAddHelper(req, resource, {}, {uuid: 'page-uuid'});
        expect(props.recordId).toBe('page-uuid');
        expect(props.postLink).toBe('/admin/model/PageModel/edit/page-uuid');
    });

    it('does not infer history identity from submitted create-form values', async () => {
        const {req, resource} = fixture();
        const props = await inertiaAddHelper(req, resource, {}, undefined, false, {id: 84});
        expect(props.recordId).toBeUndefined();
        expect(props.edit).toBe(false);
    });
});
