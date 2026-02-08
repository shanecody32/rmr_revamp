import { describe, expect, it } from 'vitest';
import { validators, formatters } from '../validation';

// ─── Validators ──────────────────────────────────────────────────

describe('validators.required', () => {
    it('returns true for truthy string', () => {
        expect(validators.required('hello')).toBe(true);
    });
    it('returns false for empty string', () => {
        expect(validators.required('')).toBe(false);
    });
    it('returns false for null', () => {
        expect(validators.required(null)).toBe(false);
    });
    it('returns false for undefined', () => {
        expect(validators.required(undefined)).toBe(false);
    });
    it('returns false for zero', () => {
        expect(validators.required(0)).toBe(false);
    });
    it('returns true for non-zero number', () => {
        expect(validators.required(42)).toBe(true);
    });
});

describe('validators.email', () => {
    it('accepts valid email', () => {
        expect(validators.email('user@example.com')).toBe(true);
    });
    it('accepts subdomain email', () => {
        expect(validators.email('user@mail.example.com')).toBe(true);
    });
    it('rejects missing @', () => {
        expect(validators.email('userexample.com')).toBe(false);
    });
    it('rejects missing domain', () => {
        expect(validators.email('user@')).toBe(false);
    });
    it('rejects missing local part', () => {
        expect(validators.email('@example.com')).toBe(false);
    });
    it('rejects empty string', () => {
        expect(validators.email('')).toBe(false);
    });
});

describe('validators.url', () => {
    it('accepts http URL', () => {
        expect(validators.url('http://example.com')).toBe(true);
    });
    it('accepts https URL with path', () => {
        expect(validators.url('https://example.com/path/to/page')).toBe(true);
    });
    it('rejects plain string', () => {
        expect(validators.url('not-a-url')).toBe(false);
    });
    it('rejects missing protocol', () => {
        expect(validators.url('example.com')).toBe(false);
    });
    it('rejects empty string', () => {
        expect(validators.url('')).toBe(false);
    });
});

describe('validators.phone', () => {
    it('accepts digits only', () => {
        expect(validators.phone('1234567890')).toBe(true);
    });
    it('accepts formatted number', () => {
        expect(validators.phone('(123) 456-7890')).toBe(true);
    });
    it('accepts international format', () => {
        expect(validators.phone('+1 234-567-8901')).toBe(true);
    });
    it('rejects letters', () => {
        expect(validators.phone('abc-def-ghij')).toBe(false);
    });
    it('rejects empty string', () => {
        expect(validators.phone('')).toBe(false);
    });
});

describe('validators.zipCode', () => {
    it('accepts 5-digit zip', () => {
        expect(validators.zipCode('12345')).toBe(true);
    });
    it('accepts ZIP+4 format', () => {
        expect(validators.zipCode('12345-6789')).toBe(true);
    });
    it('rejects short zip', () => {
        expect(validators.zipCode('1234')).toBe(false);
    });
    it('rejects long zip without dash', () => {
        expect(validators.zipCode('123456')).toBe(false);
    });
    it('rejects letters', () => {
        expect(validators.zipCode('abcde')).toBe(false);
    });
});

describe('validators.number', () => {
    it('accepts integer', () => {
        expect(validators.number(42)).toBe(true);
    });
    it('accepts decimal', () => {
        expect(validators.number(3.14)).toBe(true);
    });
    it('accepts negative', () => {
        expect(validators.number(-5)).toBe(true);
    });
    it('accepts zero', () => {
        expect(validators.number(0)).toBe(true);
    });
    it('rejects letters', () => {
        expect(validators.number('abc')).toBe(false);
    });
});

describe('validators.minLength', () => {
    it('passes at minimum', () => {
        expect(validators.minLength(3)('abc')).toBe(true);
    });
    it('passes above minimum', () => {
        expect(validators.minLength(3)('abcd')).toBe(true);
    });
    it('fails below minimum', () => {
        expect(validators.minLength(3)('ab')).toBe(false);
    });
});

describe('validators.maxLength', () => {
    it('passes at maximum', () => {
        expect(validators.maxLength(5)('abcde')).toBe(true);
    });
    it('passes below maximum', () => {
        expect(validators.maxLength(5)('abc')).toBe(true);
    });
    it('fails above maximum', () => {
        expect(validators.maxLength(5)('abcdef')).toBe(false);
    });
});

describe('validators.min', () => {
    it('passes at minimum', () => {
        expect(validators.min(10)(10)).toBe(true);
    });
    it('passes above minimum', () => {
        expect(validators.min(10)(15)).toBe(true);
    });
    it('fails below minimum', () => {
        expect(validators.min(10)(5)).toBe(false);
    });
});

describe('validators.max', () => {
    it('passes at maximum', () => {
        expect(validators.max(100)(100)).toBe(true);
    });
    it('passes below maximum', () => {
        expect(validators.max(100)(50)).toBe(true);
    });
    it('fails above maximum', () => {
        expect(validators.max(100)(150)).toBe(false);
    });
});

// ─── Formatters ──────────────────────────────────────────────────

describe('formatters.phone', () => {
    it('formats 10 digits', () => {
        expect(formatters.phone('1234567890')).toBe('(123) 456-7890');
    });
    it('formats already-formatted number by stripping and re-formatting', () => {
        expect(formatters.phone('(123) 456-7890')).toBe('(123) 456-7890');
    });
    it('returns original for non-10-digit input', () => {
        expect(formatters.phone('12345')).toBe('12345');
    });
    it('returns original for 11 digits', () => {
        expect(formatters.phone('12345678901')).toBe('12345678901');
    });
});

describe('formatters.currency', () => {
    it('formats with USD default', () => {
        expect(formatters.currency(1234.56)).toBe('$1,234.56');
    });
    it('formats with custom currency and locale', () => {
        const result = formatters.currency(1234.56, 'EUR', 'de-DE');
        // Different environments may format slightly differently, but should contain the value
        expect(result).toContain('1.234,56');
    });
    it('formats zero', () => {
        expect(formatters.currency(0)).toBe('$0.00');
    });
});

describe('formatters.date', () => {
    it('formats with default locale', () => {
        const date = new Date(2024, 0, 15); // Jan 15, 2024
        expect(formatters.date(date)).toBe('1/15/2024');
    });
    it('formats with custom locale', () => {
        const date = new Date(2024, 0, 15);
        expect(formatters.date(date, 'en-GB')).toBe('15/01/2024');
    });
    it('handles year boundary', () => {
        const date = new Date(2024, 11, 31); // Dec 31, 2024
        expect(formatters.date(date)).toBe('12/31/2024');
    });
});
