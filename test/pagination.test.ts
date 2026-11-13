import {describe, expect, it} from 'vitest';
import {generatePagination} from '../src/assets/js/lib/pagination';

describe('table pagination range', () => {
    it.each([5, 20, 50])('shows 0–0 for an empty list with page size %i', count => {
        const result = generatePagination(0, count, 1, 5);
        expect([result.from, result.to, result.total]).toEqual([0, 0, 0]);
        expect(result.prev_page_url).toBeNull();
        expect(result.next_page_url).toBeNull();
    });

    it('has no previous page after filtering a later page down to zero records', () => {
        const result = generatePagination(0, 20, 4, 5);
        expect([result.from, result.to]).toEqual([0, 0]);
        expect(result.prev_page_url).toBeNull();
        expect(result.next_page_url).toBeNull();
    });

    it('preserves a populated page and a partial last page', () => {
        expect(generatePagination(53, 20, 2, 5)).toMatchObject({from: 21, to: 40, total: 53, prev_page_url: true, next_page_url: true});
        expect(generatePagination(53, 20, 3, 5)).toMatchObject({from: 41, to: 53, total: 53, prev_page_url: true, next_page_url: null});
    });
});
