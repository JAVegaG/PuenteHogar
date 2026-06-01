// Feature: tenant-flows-ux-fix, Property 1: Bug Condition — Tenant Lease Detail Endpoint Missing
// Validates: Requirements 1.1, 1.2
//
// This test MUST FAIL on unfixed code — failure confirms the bug exists.
// DO NOT fix the test or the code when it fails.

jest.mock('@src/shared/prisma/prisma.service', () => ({
    PrismaService: jest.fn(),
}));

import * as fc from 'fast-check';

/**
 * Bug Condition Exploration — Missing Tenant Lease Detail Endpoint
 *
 * The tenant lease detail page requires a dedicated endpoint:
 * - GET /leases/:leaseId/detail (tenant-facing lease detail with property info)
 *
 * Currently, the only lease detail endpoint is:
 * - GET /portfolio/:portfolioId/units/:unitId/leases/:leaseId (landlord-only)
 *
 * This test verifies that no TenantLeasesController file exists in the
 * landlord-portfolio module — proving the bug condition holds.
 */
describe('Property 1: Bug Condition — Missing Tenant Lease Detail Endpoint', () => {

    /**
     * Property 1d: GET /leases/:leaseId/detail endpoint does not exist.
     * The landlord-portfolio module only has LandlordPortfolioController
     * which serves landlord-only routes under /portfolio prefix.
     * There is no tenant-leases.controller.ts file.
     *
     * Validates: Req 1.1, 1.2 — Lease detail shows tracking instead of property info
     */
    it('Bug Condition — tenant-leases.controller.ts does not exist in landlord-portfolio module', () => {
        fc.assert(
            fc.property(
                fc.uuid(), // any leaseId
                (leaseId) => {
                    // Try to import the tenant-leases controller — it should exist for the fix
                    let hasTenantLeasesController = false;
                    try {
                        require('@modules/landlord-portfolio/tenant-leases.controller');
                        hasTenantLeasesController = true;
                    } catch {
                        hasTenantLeasesController = false;
                    }

                    // BUG CONDITION: This SHOULD be true (controller file should exist)
                    // but it is false on unfixed code — proving the bug
                    expect(hasTenantLeasesController).toBe(true);
                },
            ),
            { numRuns: 1 },
        );
    });
});
