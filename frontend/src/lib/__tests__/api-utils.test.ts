import { describe, it, expect } from 'vitest';
import { serializeParams, createSWRKey, cleanParams } from '../api/utils';

describe('serializeParams', () => {
    it('sorts keys alphabetically', () => {
        const result = serializeParams({ z: 1, a: 2, m: 3 });
        expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it('strips null and undefined values', () => {
        const result = serializeParams({ keep: 'yes', drop: null, also_drop: undefined });
        expect(result).toBe('{"keep":"yes"}');
    });

    it('handles empty object', () => {
        expect(serializeParams({})).toBe('{}');
    });

    it('preserves numeric and boolean values', () => {
        const result = serializeParams({ num: 42, bool: true, str: 'hello' });
        const parsed = JSON.parse(result);
        expect(parsed.num).toBe(42);
        expect(parsed.bool).toBe(true);
        expect(parsed.str).toBe('hello');
    });
});

describe('createSWRKey', () => {
    it('returns endpoint string when no params', () => {
        expect(createSWRKey('/api/bands')).toBe('/api/bands');
    });

    it('returns endpoint string when params is empty object', () => {
        expect(createSWRKey('/api/bands', {})).toBe('/api/bands');
    });

    it('returns tuple when params have values', () => {
        const result = createSWRKey('/api/bands', { page: 1 });
        expect(result).toEqual(['/api/bands', { page: 1 }]);
    });
});

describe('cleanParams', () => {
    it('removes undefined values', () => {
        const result = cleanParams({ a: 1, b: undefined, c: 'hello' });
        expect(result).toEqual({ a: 1, c: 'hello' });
    });

    it('removes null values', () => {
        const result = cleanParams({ a: 1, b: null, c: 'hello' });
        expect(result).toEqual({ a: 1, c: 'hello' });
    });

    it('preserves zero and empty string', () => {
        const result = cleanParams({ a: 0, b: '', c: false });
        expect(result).toEqual({ a: 0, b: '', c: false });
    });

    it('handles empty object', () => {
        expect(cleanParams({})).toEqual({});
    });
});
