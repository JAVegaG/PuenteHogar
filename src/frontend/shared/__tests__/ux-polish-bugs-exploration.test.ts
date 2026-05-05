/**
 * Bug Condition Exploration Tests — UX Polish Fixes
 *
 * These tests encode the EXPECTED (correct) behavior for each bug.
 * On UNFIXED code, they will FAIL — confirming the bugs exist.
 * After fixes are applied, they will PASS — confirming the bugs are resolved.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { formatPrice } from '@/shared/utils/formatPrice';

const DOLLAR = '\u0024';

describe('Bug Condition Exploration — UX Polish Bugs Exist on Unfixed Code', () => {
    // ─── Test 1a: ConfirmationDialog variant="primary" should use blue button ───
    describe('Test 1a: ConfirmationDialog variant="primary" uses blue button', () => {
        it('ConfirmationDialog component should accept variant prop and apply bg-[#1d4ed8] for primary', () => {
            /**
             * **Validates: Requirements 2.1**
             */
            const source = fs.readFileSync(
                path.resolve(__dirname, '../../shared/components/ConfirmationDialog.tsx'),
                'utf-8',
            );

            const hasVariantProp = source.includes('variant') && source.includes("'primary'");
            const hasPrimaryBlueClass = source.includes('bg-[#1d4ed8]');

            expect(hasVariantProp).toBe(true);
            expect(hasPrimaryBlueClass).toBe(true);
        });
    });

    // ─── Test 1b: Error message renders BEFORE button in ContactLandlordButton ───
    describe('Test 1b: ContactLandlordButton error renders above button', () => {
        it('error message element should appear before the button in JSX order', () => {
            /**
             * **Validates: Requirements 2.2**
             */
            const source = fs.readFileSync(
                path.resolve(__dirname, '../../modules/tenant/components/ContactLandlordButton.tsx'),
                'utf-8',
            );

            const buttonIndex = source.indexOf('<button');
            const messageIndex = source.indexOf('{message && (');

            expect(messageIndex).toBeGreaterThan(-1);
            expect(buttonIndex).toBeGreaterThan(-1);
            expect(messageIndex).toBeLessThan(buttonIndex);
        });
    });

    // ─── Test 1c: ContractWizard pre-fills startDate from lease ───
    describe('Test 1c: ContractWizard pre-fills startDate from lease', () => {
        it('formData initializer should use lease.startDate instead of empty string', () => {
            /**
             * **Validates: Requirements 2.3**
             */
            const source = fs.readFileSync(
                path.resolve(
                    __dirname,
                    '../../modules/landlord-contracts/components/ContractWizard.tsx',
                ),
                'utf-8',
            );

            const hasLeaseStartDateInit =
                source.includes('startDate: lease.startDate') ||
                source.includes('startDate: lease?.startDate');

            expect(hasLeaseStartDateInit).toBe(true);
        });
    });

    // ─── Test 1d: formatPrice prepends $ symbol ───
    describe('Test 1d: formatPrice prepends ' + DOLLAR + ' symbol', () => {
        it('formatPrice(1200000) should start with ' + DOLLAR + ' and contain exactly one ' + DOLLAR, () => {
            /**
             * **Validates: Requirements 2.4**
             */
            const result = formatPrice(1200000);

            expect(result.startsWith(DOLLAR)).toBe(true);
            const dollarCount = result.split('').filter(c => c === DOLLAR).length;
            expect(dollarCount).toBe(1);
        });

        it('property: for any positive integer, formatPrice output starts with ' + DOLLAR + ' and has exactly one ' + DOLLAR, () => {
            /**
             * **Validates: Requirements 2.4**
             */
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 100_000_000 }), (amount) => {
                    const result = formatPrice(amount);
                    const dollarCount = result.split('').filter(c => c === DOLLAR).length;
                    return result.startsWith(DOLLAR) && dollarCount === 1;
                }),
            );
        });
    });

    // ─── Test 1e: Local formatCOP in ListingManagementView produces single $ ───
    describe('Test 1e: ListingManagementView formatCOP produces single ' + DOLLAR, () => {
        it('local formatCOP in ListingManagementView source should prepend exactly one ' + DOLLAR, () => {
            /**
             * **Validates: Requirements 2.4**
             *
             * Verify the ACTUAL formatCOP function in ListingManagementView returns
             * a string starting with exactly one $ symbol.
             */
            const source = fs.readFileSync(
                path.resolve(__dirname, '../../modules/landlord-portfolio/components/ListingManagementView.tsx'),
                'utf-8',
            );

            // Extract the formatCOP function body
            const funcMatch = source.match(/function formatCOP\(amount: number\): string \{[\s\S]*?return [`']([^`']*)[`'];?\s*\}/);
            expect(funcMatch).not.toBeNull();

            // The return template should contain a literal $ before the interpolation
            const returnStatement = funcMatch![0];
            const hasLiteralDollar = returnStatement.includes('return `$${');

            expect(hasLiteralDollar).toBe(true);
        });
    });

    // ─── Test 1f: Pagination select has appearance-none class ───
    describe('Test 1f: Pagination select has appearance-none class', () => {
        it('Pagination select element should have appearance-none class', () => {
            /**
             * **Validates: Requirements 2.5**
             */
            const source = fs.readFileSync(
                path.resolve(__dirname, '../../shared/components/Pagination.tsx'),
                'utf-8',
            );

            const selectMatch = source.match(/<select[\s\S]*?className="([^"]+)"/);
            expect(selectMatch).not.toBeNull();

            const selectClassName = selectMatch![1];
            expect(selectClassName).toContain('appearance-none');
        });
    });

    // ─── Test 1h: documentation/MVP-STUB-TESTING-GUIDE.md exists ───
    describe('Test 1h: MVP-STUB-TESTING-GUIDE.md exists', () => {
        it('documentation/MVP-STUB-TESTING-GUIDE.md should exist', () => {
            /**
             * **Validates: Requirements 2.7**
             */
            const filePath = path.resolve(__dirname, '../../../../documentation/MVP-STUB-TESTING-GUIDE.md');
            const exists = fs.existsSync(filePath);
            expect(exists).toBe(true);
        });
    });
});
