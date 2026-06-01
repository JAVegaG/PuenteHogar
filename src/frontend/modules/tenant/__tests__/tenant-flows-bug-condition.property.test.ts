// Feature: tenant-flows-ux-fix, Property 1: Bug Condition — Tenant UX Shows Wrong Content
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
//
// This test MUST FAIL on unfixed code — failure confirms the bug exists.
// DO NOT fix the test or the code when it fails.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { tenantService } from '@/shared/services/tenant';

/**
 * Bug Condition Exploration — Frontend Missing API Methods & Wrong Component Behavior
 *
 * The tenant flows require the following service methods to exist:
 * - tenantService.getTenantLeaseDetail(leaseId, token) -> GET /leases/:leaseId/detail
 * - tenantService.getPaymentUnits(token) -> GET /payments/units
 * - tenantService.getPaymentDetail(paymentId, token) -> GET /payments/:paymentId/detail
 *
 * Currently, the tenant service only has:
 * - getActiveLeases(token) -> GET /tracking/leases/active
 * - getLeaseStatus(leaseId, token) -> GET /tracking/leases/:leaseId/status
 * - getPaymentHistory(token) -> GET /payments/history (flat list, no unit grouping)
 * - initiatePayment(data, token) -> POST /payments/initiate
 *
 * This test verifies that the required methods DO NOT exist, proving the bug condition.
 */
describe('Property 1: Bug Condition — Frontend Missing Service Methods for Tenant Flows', () => {

    /**
     * Property 1e: tenantService.getTenantLeaseDetail does not exist.
     * The RentalDetailView calls getLeaseStatus which returns tracking data only
     * (currentState, lastChangedAt, history) — NOT property info, rent, or next payment.
     *
     * Validates: Req 1.1, 1.2 — Lease detail shows tracking instead of property info
     */
    it('Bug Condition — tenantService.getTenantLeaseDetail method does not exist', () => {
        fc.assert(
            fc.property(
                fc.uuid(), // any leaseId
                (leaseId) => {
                    // The service SHOULD have a getTenantLeaseDetail method
                    const hasMethod = 'getTenantLeaseDetail' in tenantService &&
                        typeof (tenantService as Record<string, unknown>).getTenantLeaseDetail === 'function';

                    // BUG CONDITION: This SHOULD be true (method should exist)
                    // but it is false on unfixed code — proving the bug
                    expect(hasMethod).toBe(true);
                },
            ),
            { numRuns: 1 },
        );
    });

    /**
     * Property 1f: tenantService.getPaymentUnits does not exist.
     * The PaymentsView calls getPaymentHistory which returns a flat list of all payments
     * without any unit/property grouping.
     *
     * Validates: Req 1.3 — Payments page shows flat list instead of unit-grouped view
     */
    it('Bug Condition — tenantService.getPaymentUnits method does not exist', () => {
        fc.assert(
            fc.property(
                fc.constant('any-token'),
                (token) => {
                    // The service SHOULD have a getPaymentUnits method
                    const hasMethod = 'getPaymentUnits' in tenantService &&
                        typeof (tenantService as Record<string, unknown>).getPaymentUnits === 'function';

                    // BUG CONDITION: This SHOULD be true (method should exist)
                    // but it is false on unfixed code — proving the bug
                    expect(hasMethod).toBe(true);
                },
            ),
            { numRuns: 1 },
        );
    });

    /**
     * Property 1g: tenantService.getPaymentDetail does not exist.
     * There is no way to fetch payment detail (line items, receipt data) for a specific payment.
     * The current flow initiates payment inline without showing a detail/checkout page.
     *
     * Validates: Req 1.5, 1.6 — No payment detail/checkout page
     */
    it('Bug Condition — tenantService.getPaymentDetail method does not exist', () => {
        fc.assert(
            fc.property(
                fc.uuid(), // any paymentId
                (paymentId) => {
                    // The service SHOULD have a getPaymentDetail method
                    const hasMethod = 'getPaymentDetail' in tenantService &&
                        typeof (tenantService as Record<string, unknown>).getPaymentDetail === 'function';

                    // BUG CONDITION: This SHOULD be true (method should exist)
                    // but it is false on unfixed code — proving the bug
                    expect(hasMethod).toBe(true);
                },
            ),
            { numRuns: 1 },
        );
    });
});

/**
 * Bug Condition Exploration — RentalDetailView Renders Tracking Instead of Property Info
 *
 * The RentalDetailView component currently renders:
 * - "Estado actual" heading (tracking state)
 * - "Progreso del arriendo" timeline
 * - "Historial" of state changes
 *
 * It does NOT render:
 * - Property info card (type, neighborhood, address)
 * - "Canon mensual" (monthly rent amount)
 * - Next payment card with "Pagar ahora" button
 * - "Ver historial de pagos" link
 */
describe('Property 1: Bug Condition — RentalDetailView Shows Tracking Instead of Property Info', () => {

    /**
     * Property 1h: The RentalDetailView component uses getLeaseStatus (tracking data)
     * instead of getTenantLeaseDetail (property info + next payment).
     *
     * The tenant service has getLeaseStatus but NOT getTenantLeaseDetail,
     * meaning the component cannot fetch property info.
     *
     * Validates: Req 1.1, 1.2 — Lease detail shows tracking instead of property info
     */
    it('Bug Condition — RentalDetailView uses tracking data (getLeaseStatus) instead of property info (getTenantLeaseDetail)', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('PUBLISHED', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED'),
                (currentState) => {
                    // The tenant service has getLeaseStatus (tracking data) — this is what
                    // RentalDetailView currently uses
                    const hasTrackingMethod = 'getLeaseStatus' in tenantService &&
                        typeof tenantService.getLeaseStatus === 'function';
                    expect(hasTrackingMethod).toBe(true);

                    // BUG CONDITION: The tenant service SHOULD ALSO have getTenantLeaseDetail
                    // (property info + next payment) — but it does not exist on unfixed code
                    const hasPropertyInfoMethod = 'getTenantLeaseDetail' in tenantService &&
                        typeof (tenantService as Record<string, unknown>).getTenantLeaseDetail === 'function';

                    // This SHOULD be true but is false — proving the bug
                    expect(hasPropertyInfoMethod).toBe(true);
                },
            ),
            { numRuns: 1 },
        );
    });
});

/**
 * Bug Condition Exploration — PaymentsView Renders Flat List Instead of Unit Cards
 *
 * The PaymentsView component currently:
 * - Calls tenantService.getPaymentHistory(token) which returns a flat array
 * - Renders individual payment cards with amount, due date, status, "Pagar" button
 * - Has a handlePay function that calls tenantService.initiatePayment inline
 *
 * It does NOT:
 * - Call getPaymentUnits to get unit-grouped cards
 * - Render unit cards grouped by property
 * - Navigate to /mis-pagos/{unitId} on card click
 */
describe('Property 1: Bug Condition — PaymentsView Shows Flat List Instead of Unit Cards', () => {

    /**
     * Property 1i: The PaymentsView component uses getPaymentHistory (flat list)
     * instead of getPaymentUnits (unit-grouped cards).
     *
     * We verify this by checking that the tenantService has getPaymentHistory
     * but NOT getPaymentUnits — proving the component cannot render unit cards.
     *
     * Validates: Req 1.3, 1.4 — Payments page shows flat list, no unit grouping
     */
    it('Bug Condition — tenantService has getPaymentHistory (flat) but not getPaymentUnits (grouped)', () => {
        fc.assert(
            fc.property(
                fc.constant(true),
                () => {
                    // The service HAS getPaymentHistory (flat list — the buggy behavior)
                    const hasFlatHistory = 'getPaymentHistory' in tenantService &&
                        typeof tenantService.getPaymentHistory === 'function';
                    expect(hasFlatHistory).toBe(true);

                    // The service SHOULD ALSO have getPaymentUnits (unit-grouped cards)
                    // BUG CONDITION: This method does not exist on unfixed code
                    const hasUnitGrouped = 'getPaymentUnits' in tenantService &&
                        typeof (tenantService as Record<string, unknown>).getPaymentUnits === 'function';

                    // This SHOULD be true but is false — proving the bug
                    expect(hasUnitGrouped).toBe(true);
                },
            ),
            { numRuns: 1 },
        );
    });
});
