/**
 * Preservation Property Tests — UX Polish Fixes
 *
 * These tests verify CURRENT behavior that must remain unchanged after fixes.
 * They must PASS on UNFIXED code — confirming the baseline behavior to preserve.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const DOLLAR = '\u0024';

// ─── Helper: Read source file ───
function readSource(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf-8');
}

// ─── Helper: Replicate the CURRENT formatCOP from StepTerms.tsx ───
// This is the string-based variant that takes raw digit strings
function formatCOP_StepTerms(raw: string): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return DOLLAR + Number(digits).toLocaleString('es-CO');
}

describe('Preservation Property Tests — Existing Behavior Unchanged', () => {
    // ─── Property 2a: ConfirmationDialog without variant renders red bg-red-600 button ───
    describe('Property 2a: ConfirmationDialog default destructive styling preserved', () => {
        it('ConfirmationDialog confirm button has bg-red-600 class (no variant prop in current code)', () => {
            /**
             * **Validates: Requirements 3.1, 3.6**
             *
             * Observation: On unfixed code, ConfirmationDialog has NO variant prop.
             * The confirm button always uses bg-red-600. This must be preserved as
             * the default behavior after the fix adds variant support.
             */
            const source = readSource('../../shared/components/ConfirmationDialog.tsx');

            // The confirm button (second button in the dialog) has bg-red-600
            const hasRedClass = source.includes('bg-red-600');
            expect(hasRedClass).toBe(true);
        });

        it('property: for any combination of ConfirmationDialog props, confirm button styling includes bg-red-600 in source', () => {
            /**
             * **Validates: Requirements 3.1, 3.6**
             *
             * Since the current code has no variant prop, the red styling is always applied.
             * We verify this by checking the source contains the hardcoded red class.
             */
            fc.assert(
                fc.property(
                    fc.record({
                        title: fc.string({ minLength: 1, maxLength: 50 }),
                        message: fc.string({ minLength: 1, maxLength: 200 }),
                        confirmLabel: fc.string({ minLength: 1, maxLength: 30 }),
                    }),
                    () => {
                        // Regardless of props, the source always has bg-red-600 on the confirm button
                        const source = readSource('../../shared/components/ConfirmationDialog.tsx');
                        const confirmButtonMatch = source.match(
                            /onClick=\{onConfirm\}[\s\S]*?className="([^"]+)"/
                        );
                        expect(confirmButtonMatch).not.toBeNull();
                        expect(confirmButtonMatch![1]).toContain('bg-red-600');
                        return true;
                    },
                ),
                { numRuns: 5 }, // Source-based check, no need for many runs
            );
        });
    });

    // ─── Property 2b: ContactLandlordButton success message displays correctly ───
    describe('Property 2b: ContactLandlordButton success message preserved', () => {
        it('ContactLandlordButton renders success message with correct text and green styling', () => {
            /**
             * **Validates: Requirements 3.2**
             *
             * Observation: On unfixed code, the success message
             * "El contacto ha sido iniciado. El arrendador será notificado."
             * is rendered with green styling (bg-green-50 text-green-800).
             */
            const source = readSource(
                '../../modules/tenant/components/ContactLandlordButton.tsx',
            );

            // Success message text exists
            expect(source).toContain(
                'El contacto ha sido iniciado. El arrendador será notificado.',
            );

            // Success styling exists
            expect(source).toContain('bg-green-50');
            expect(source).toContain('text-green-800');
        });
    });

    // ─── Property 2c: ContractWizard pre-fills monthlyRent from lease.monthlyAmount ───
    describe('Property 2c: ContractWizard monthlyRent pre-fill preserved', () => {
        it('ContractWizard initializes monthlyRent as String(lease.monthlyAmount || "")', () => {
            /**
             * **Validates: Requirements 3.3**
             *
             * Observation: On unfixed code, monthlyRent is pre-filled from
             * lease.monthlyAmount using String(lease.monthlyAmount || '').
             */
            const source = readSource(
                '../../modules/landlord-contracts/components/ContractWizard.tsx',
            );

            // The monthlyRent initialization pattern exists
            const hasMonthlyRentInit =
                source.includes("monthlyRent: String(lease.monthlyAmount || '')") ||
                source.includes('monthlyRent: String(lease.monthlyAmount || "")');
            expect(hasMonthlyRentInit).toBe(true);
        });

        it('property: for any positive lease amount, monthlyRent is String(amount)', () => {
            /**
             * **Validates: Requirements 3.3**
             *
             * The pre-fill logic is String(lease.monthlyAmount || '').
             * For any positive number, this produces the string representation.
             */
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100_000_000 }),
                    (monthlyAmount) => {
                        // Replicate the pre-fill logic from ContractWizard
                        const result = String(monthlyAmount || '');
                        expect(result).toBe(String(monthlyAmount));
                        return result === String(monthlyAmount);
                    },
                ),
            );
        });

        it('property: for zero or falsy monthlyAmount, monthlyRent is empty string', () => {
            /**
             * **Validates: Requirements 3.3**
             */
            fc.assert(
                fc.property(
                    fc.constantFrom(0, null, undefined),
                    (monthlyAmount) => {
                        const result = String(monthlyAmount || '');
                        return result === '';
                    },
                ),
            );
        });
    });

    // ─── Property 2d: formatCOP with clean digit strings produces correct output ───
    describe('Property 2d: formatCOP clean digit input formatting preserved', () => {
        it('formatCOP("1200000") produces "$1.200.000"', () => {
            /**
             * **Validates: Requirements 3.4**
             *
             * Observation: On unfixed code, formatCOP("1200000") (clean digits, no $)
             * produces "$1.200.000" correctly.
             */
            const result = formatCOP_StepTerms('1200000');
            expect(result).toBe(`${DOLLAR}1.200.000`);
        });

        it('property: for all clean digit strings (no $ prefix), formatCOP produces $ + thousand-separated digits', () => {
            /**
             * **Validates: Requirements 3.4**
             *
             * For any positive integer represented as a clean digit string,
             * formatCOP should produce "$" + locale-formatted number.
             */
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 999_999_999 }),
                    (amount) => {
                        const input = String(amount);
                        const result = formatCOP_StepTerms(input);

                        // Must start with exactly one $
                        expect(result.startsWith(DOLLAR)).toBe(true);
                        const dollarCount = result.split('').filter(c => c === DOLLAR).length;
                        expect(dollarCount).toBe(1);

                        // Must match the expected locale format
                        const expected = DOLLAR + amount.toLocaleString('es-CO');
                        expect(result).toBe(expected);

                        return true;
                    },
                ),
            );
        });

        it('property: formatCOP with empty or whitespace-only input returns empty string', () => {
            /**
             * **Validates: Requirements 3.4**
             */
            fc.assert(
                fc.property(
                    fc.constantFrom('', '   ', '\t', '\n'),
                    (input) => {
                        const result = formatCOP_StepTerms(input);
                        return result === '';
                    },
                ),
            );
        });
    });

    // ─── Property 2e: Pagination navigation buttons preserved ───
    describe('Property 2e: Pagination navigation buttons, touch targets, aria attributes preserved', () => {
        it('Pagination page buttons have min 44px touch targets', () => {
            /**
             * **Validates: Requirements 3.5**
             *
             * Observation: On unfixed code, all page buttons and navigation buttons
             * have min-w-[44px] min-h-[44px] for WCAG touch target compliance.
             */
            const source = readSource('../../shared/components/Pagination.tsx');

            // All buttons have min touch targets
            const buttonMatches = source.match(/className="[^"]*min-w-\[44px\] min-h-\[44px\][^"]*"/g);
            expect(buttonMatches).not.toBeNull();
            // At least 3 buttons: prev, page number, next
            expect(buttonMatches!.length).toBeGreaterThanOrEqual(3);
        });

        it('Pagination has correct aria-label attributes', () => {
            /**
             * **Validates: Requirements 3.5**
             */
            const source = readSource('../../shared/components/Pagination.tsx');

            // Nav has aria-label
            expect(source).toContain('aria-label="Paginación"');

            // Previous button has aria-label
            expect(source).toContain('aria-label="Página anterior"');

            // Next button has aria-label
            expect(source).toContain('aria-label="Página siguiente"');

            // Page buttons have dynamic aria-label
            expect(source).toMatch(/aria-label=\{`Página \$\{item\}`\}/);

            // Current page has aria-current
            expect(source).toMatch(/aria-current=\{item === page \? 'page' : undefined\}/);
        });

        it('Pagination renders ellipsis for gaps in page numbers', () => {
            /**
             * **Validates: Requirements 3.5**
             */
            const source = readSource('../../shared/components/Pagination.tsx');

            // Ellipsis rendering exists
            expect(source).toContain("item === '...'");
            expect(source).toContain('…'); // Unicode ellipsis character
        });

        it('Pagination prev/next buttons have disabled state handling', () => {
            /**
             * **Validates: Requirements 3.5**
             */
            const source = readSource('../../shared/components/Pagination.tsx');

            // Previous button disabled when page <= 1
            expect(source).toContain('disabled={page <= 1}');

            // Next button disabled when page >= totalPages
            expect(source).toContain('disabled={page >= totalPages}');

            // Disabled styling
            expect(source).toContain('disabled:opacity-50');
            expect(source).toContain('disabled:cursor-not-allowed');
        });

        it('property: buildPageNumbers produces valid page arrays for any total/current combination', () => {
            /**
             * **Validates: Requirements 3.5**
             *
             * Verify the pagination logic produces correct page number arrays.
             * We replicate the buildPageNumbers function from the source.
             */
            function buildPageNumbers(current: number, total: number): (number | '...')[] {
                if (total <= 5) {
                    return Array.from({ length: total }, (_, i) => i + 1);
                }

                const pages = new Set<number>();
                pages.add(1);
                pages.add(total);
                for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
                    pages.add(i);
                }

                const sorted = Array.from(pages).sort((a, b) => a - b);
                const result: (number | '...')[] = [];

                for (let i = 0; i < sorted.length; i++) {
                    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
                        result.push('...');
                    }
                    result.push(sorted[i]);
                }

                return result;
            }

            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100 }), // totalPages
                    fc.integer({ min: 1, max: 100 }), // currentPage
                    (totalPages, currentPage) => {
                        // Ensure currentPage is within bounds
                        const current = Math.min(currentPage, totalPages);
                        const result = buildPageNumbers(current, totalPages);

                        // Result should always contain page 1 and last page (if total > 0)
                        if (totalPages > 0) {
                            const numericPages = result.filter(
                                (x): x is number => typeof x === 'number',
                            );
                            expect(numericPages).toContain(1);
                            expect(numericPages).toContain(totalPages);
                            // Current page should be included
                            expect(numericPages).toContain(current);
                            // All numeric pages should be in range [1, totalPages]
                            for (const p of numericPages) {
                                expect(p).toBeGreaterThanOrEqual(1);
                                expect(p).toBeLessThanOrEqual(totalPages);
                            }
                        }

                        return true;
                    },
                ),
            );
        });
    });
});
