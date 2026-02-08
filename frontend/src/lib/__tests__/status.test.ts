import { describe, it, expect } from 'vitest';
import { getStatusDisplay } from '../utils/status';

describe('getStatusDisplay', () => {
    it('verified and approved', () => {
        const result = getStatusDisplay(true, true);
        expect(result.color).toBe('success');
        expect(result.text).toBe('Verified & Approved');
    });

    it('verified only', () => {
        const result = getStatusDisplay(true, false);
        expect(result.color).toBe('processing');
        expect(result.text).toBe('Verified Only');
    });

    it('approved only', () => {
        const result = getStatusDisplay(false, true);
        expect(result.color).toBe('warning');
        expect(result.text).toBe('Approved Only');
    });

    it('neither verified nor approved', () => {
        const result = getStatusDisplay(false, false);
        expect(result.color).toBe('default');
        expect(result.text).toBe('Pending');
    });
});
