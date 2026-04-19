import { describe, it, expect } from 'vitest';
import { computePeriod } from '../utils';

describe('computePeriod', () => {
    it('subtracts 1 month for "1m"', () => {
        const result = computePeriod('1m', new Date(2025, 5, 15)); // June 2025
        expect(result).toEqual({ year: 2025, month: 5 }); // May 2025
    });

    it('subtracts 3 months for "3m"', () => {
        const result = computePeriod('3m', new Date(2025, 5, 15)); // June 2025
        expect(result).toEqual({ year: 2025, month: 3 }); // March 2025
    });

    it('subtracts 6 months for "6m"', () => {
        const result = computePeriod('6m', new Date(2025, 5, 15)); // June 2025
        expect(result).toEqual({ year: 2024, month: 12 }); // December 2024
    });

    it('subtracts 12 months for "12m"', () => {
        const result = computePeriod('12m', new Date(2025, 5, 15)); // June 2025
        expect(result).toEqual({ year: 2024, month: 6 }); // June 2024
    });

    it('handles year boundary (January minus 1 month)', () => {
        const result = computePeriod('1m', new Date(2025, 0, 10)); // January 2025
        expect(result).toEqual({ year: 2024, month: 12 }); // December 2024
    });

    it('returns month between 1 and 12', () => {
        const options = ['1m', '3m', '6m', '12m'] as const;
        for (const opt of options) {
            const result = computePeriod(opt, new Date(2025, 3, 1));
            expect(result.month).toBeGreaterThanOrEqual(1);
            expect(result.month).toBeLessThanOrEqual(12);
        }
    });

    it('is deterministic (same args produce same result)', () => {
        const date = new Date(2025, 7, 20);
        const a = computePeriod('3m', date);
        const b = computePeriod('3m', date);
        expect(a).toEqual(b);
    });
});
