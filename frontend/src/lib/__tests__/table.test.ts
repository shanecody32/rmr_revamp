import { describe, it, expect } from 'vitest';
import { getSortOrder, getColumnWidth, getBaseTableProps } from '../utils/table';

describe('getSortOrder', () => {
    it('returns sortOrder when field matches', () => {
        expect(getSortOrder('name', 'name', 'ascend')).toBe('ascend');
        expect(getSortOrder('name', 'name', 'descend')).toBe('descend');
    });

    it('returns null when field does not match', () => {
        expect(getSortOrder('name', 'email', 'ascend')).toBeNull();
    });

    it('returns null when no sortField', () => {
        expect(getSortOrder('name', undefined, undefined)).toBeNull();
    });
});

describe('getColumnWidth', () => {
    it('returns 250 for name', () => {
        expect(getColumnWidth('name')).toBe(250);
    });

    it('returns 150 for status', () => {
        expect(getColumnWidth('status')).toBe(150);
    });

    it('returns 150 for unknown key', () => {
        expect(getColumnWidth('foobar')).toBe(150);
    });
});

describe('getBaseTableProps', () => {
    it('returns correct structure', () => {
        const props = getBaseTableProps();
        expect(props.rowKey).toBe('id');
        expect(props.scroll).toEqual({ x: 1200 });
        expect(props.showSorterTooltip).toBe(false);
    });
});
