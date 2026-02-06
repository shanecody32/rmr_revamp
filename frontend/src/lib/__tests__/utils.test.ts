import { describe, it, expect } from 'vitest';
import { cn, formatDate } from '../utils';

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
        expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    });

    it('resolves tailwind conflicts', () => {
        // tailwind-merge should keep the last conflicting class
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles empty input', () => {
        expect(cn()).toBe('');
    });

    it('handles undefined and null', () => {
        expect(cn('base', undefined, null, 'end')).toBe('base end');
    });
});

describe('formatDate', () => {
    it('formats a valid date string', () => {
        const result = formatDate('2024-01-15T10:30:00');
        expect(result).toContain('Jan');
        expect(result).toContain('15');
        expect(result).toContain('2024');
    });

    it('returns dash for null', () => {
        expect(formatDate(null)).toBe('-');
    });

    it('returns dash for undefined', () => {
        expect(formatDate(undefined)).toBe('-');
    });

    it('returns dash for empty string', () => {
        expect(formatDate('')).toBe('-');
    });

    it('returns dash for invalid date', () => {
        expect(formatDate('not-a-date')).toBe('-');
    });
});
