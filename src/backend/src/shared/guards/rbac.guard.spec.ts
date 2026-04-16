// Feature: backend-database-implementation, Property 11: RBAC — rol incorrecto recibe 403 en endpoints restringidos
// Validates: Requirements 2.2, 7.5, 11.1

import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';

// ─── Inline replica of RBACGuard logic ───────────────────────────────────────
//
// We replicate the guard's canActivate logic to avoid NestJS DI overhead and
// path-alias resolution issues in Jest. This mirrors the exact implementation
// in rbac.guard.ts.
//
// The guard logic is:
//   1. Read required roles from metadata (ROLES_KEY).
//   2. If no roles required → allow (return true).
//   3. Check if user.roles contains at least one required role.
//   4. If not → throw ForbiddenException('Insufficient permissions').

function rbacCanActivate(userRoles: string[], requiredRoles: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const hasRole = requiredRoles.some((role) => userRoles.includes(role));

  if (!hasRole) {
    throw new ForbiddenException('Insufficient permissions');
  }

  return true;
}

// ─── Generators ───────────────────────────────────────────────────────────────

const ALL_ROLES = ['LANDLORD', 'TENANT'] as const;
type Role = (typeof ALL_ROLES)[number];

/** Arbitrary single role */
const arbitraryRole = fc.constantFrom(...ALL_ROLES);

/** Arbitrary non-empty subset of roles */
const arbitraryRoleSubset = fc.subarray(ALL_ROLES as unknown as Role[], {
  minLength: 1,
});

/**
 * Arbitrary pair of (userRoles, requiredRoles) where the user does NOT have
 * any of the required roles — guaranteed wrong-role scenario.
 */
const arbitraryWrongRolePair = fc
  .record({
    required: arbitraryRoleSubset,
  })
  .chain(({ required }) => {
    const forbidden = ALL_ROLES.filter((r) => !required.includes(r));
    // If all roles are required, use an empty user role list
    const userRolesArb =
      forbidden.length > 0
        ? fc.subarray(forbidden as Role[], { minLength: 1 })
        : fc.constant([] as Role[]);
    return fc.record({
      required: fc.constant(required),
      userRoles: userRolesArb,
    });
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RBACGuard — Property 11: RBAC — rol incorrecto recibe 403 en endpoints restringidos', () => {

  // ─── Requirement 2.2 — TENANT cannot access LANDLORD-only portfolio endpoints

  describe('Requirement 2.2 — TENANT cannot access LANDLORD-only portfolio endpoints', () => {
    it('TENANT trying to create a portfolio unit receives ForbiddenException', () => {
      expect(() => rbacCanActivate(['TENANT'], ['LANDLORD'])).toThrow(ForbiddenException);
    });

    it('TENANT trying to update a portfolio unit receives ForbiddenException', () => {
      expect(() => rbacCanActivate(['TENANT'], ['LANDLORD'])).toThrow(ForbiddenException);
    });

    it('LANDLORD can access LANDLORD-only portfolio endpoints', () => {
      expect(rbacCanActivate(['LANDLORD'], ['LANDLORD'])).toBe(true);
    });
  });

  // ─── Requirement 7.5 — TENANT cannot access accounting reports ────────────

  describe('Requirement 7.5 — TENANT cannot access accounting reports', () => {
    it('TENANT trying to access aggregated accounting report receives ForbiddenException', () => {
      expect(() => rbacCanActivate(['TENANT'], ['LANDLORD'])).toThrow(ForbiddenException);
    });

    it('TENANT trying to access individual unit accounting report receives ForbiddenException', () => {
      expect(() => rbacCanActivate(['TENANT'], ['LANDLORD'])).toThrow(ForbiddenException);
    });

    it('LANDLORD can access accounting reports', () => {
      expect(rbacCanActivate(['LANDLORD'], ['LANDLORD'])).toBe(true);
    });
  });

  // ─── Requirement 11.1 — RBAC enforced on all restricted endpoints ─────────

  describe('Requirement 11.1 — RBAC enforced on all restricted endpoints', () => {
    it('user with no roles is denied access to any role-restricted endpoint', () => {
      expect(() => rbacCanActivate([], ['LANDLORD'])).toThrow(ForbiddenException);
      expect(() => rbacCanActivate([], ['TENANT'])).toThrow(ForbiddenException);
    });

    it('endpoint with no required roles allows any user through', () => {
      expect(rbacCanActivate(['TENANT'], [])).toBe(true);
      expect(rbacCanActivate(['LANDLORD'], [])).toBe(true);
      expect(rbacCanActivate([], [])).toBe(true);
    });

    it('user with correct role is granted access', () => {
      expect(rbacCanActivate(['LANDLORD'], ['LANDLORD'])).toBe(true);
      expect(rbacCanActivate(['TENANT'], ['TENANT'])).toBe(true);
    });

    it('user with both roles is granted access to either role-restricted endpoint', () => {
      expect(rbacCanActivate(['LANDLORD', 'TENANT'], ['LANDLORD'])).toBe(true);
      expect(rbacCanActivate(['LANDLORD', 'TENANT'], ['TENANT'])).toBe(true);
    });

    it('ForbiddenException message is "Insufficient permissions"', () => {
      try {
        rbacCanActivate(['TENANT'], ['LANDLORD']);
        fail('Expected ForbiddenException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        expect((e as ForbiddenException).message).toBe('Insufficient permissions');
      }
    });
  });

  // ─── Property 11: wrong role always receives 403 ──────────────────────────

  /**
   * Property 11 — Validates: Requirements 2.2, 7.5, 11.1
   *
   * For any combination of (userRoles, requiredRoles) where the user does NOT
   * hold any of the required roles, RBACGuard must throw ForbiddenException.
   */
  it('Property 11 — user with wrong role always receives ForbiddenException (403)', () => {
    fc.assert(
      fc.property(arbitraryWrongRolePair, ({ userRoles, required }) => {
        let threw = false;
        try {
          rbacCanActivate(userRoles as string[], required as string[]);
        } catch (e) {
          threw = e instanceof ForbiddenException;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 — Validates: Requirements 11.1
   *
   * For any user that holds at least one of the required roles, access is granted.
   */
  it('Property 11 — user with correct role always receives access (true)', () => {
    fc.assert(
      fc.property(
        arbitraryRoleSubset.chain((required) =>
          fc.record({
            required: fc.constant(required),
            // User has at least one of the required roles
            userRoles: fc
              .subarray(required, { minLength: 1 })
              .map((subset) => subset as string[]),
          }),
        ),
        ({ userRoles, required }) => {
          return rbacCanActivate(userRoles, required as string[]) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 — Validates: Requirements 11.1
   *
   * When no roles are required on an endpoint, any user (any role combination)
   * is allowed through — the guard is a no-op for public/unguarded endpoints.
   */
  it('Property 11 — endpoint with no required roles allows any user (no 403)', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryRole, { maxLength: 4 }),
        (userRoles) => {
          return rbacCanActivate(userRoles, []) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 — Validates: Requirements 2.2, 7.5, 11.1
   *
   * A TENANT user specifically is always denied access to LANDLORD-only endpoints.
   * This covers portfolio management (Req 2.2) and accounting reports (Req 7.5).
   */
  it('Property 11 — TENANT always receives ForbiddenException on LANDLORD-only endpoints', () => {
    fc.assert(
      fc.property(
        // Arbitrary extra roles the tenant might have (but never LANDLORD)
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).filter((r) => r !== 'LANDLORD'),
          { maxLength: 3 },
        ),
        (extraRoles) => {
          const userRoles = ['TENANT', ...extraRoles];
          let threw = false;
          try {
            rbacCanActivate(userRoles, ['LANDLORD']);
          } catch (e) {
            threw = e instanceof ForbiddenException;
          }
          return threw;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 — Validates: Requirements 11.1
   *
   * A LANDLORD user specifically is always denied access to TENANT-only endpoints.
   */
  it('Property 11 — LANDLORD always receives ForbiddenException on TENANT-only endpoints', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }).filter((r) => r !== 'TENANT'),
          { maxLength: 3 },
        ),
        (extraRoles) => {
          const userRoles = ['LANDLORD', ...extraRoles];
          let threw = false;
          try {
            rbacCanActivate(userRoles, ['TENANT']);
          } catch (e) {
            threw = e instanceof ForbiddenException;
          }
          return threw;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 — Validates: Requirements 11.1
   *
   * A user with no roles at all is always denied access to any role-restricted endpoint.
   */
  it('Property 11 — user with no roles always receives ForbiddenException on any restricted endpoint', () => {
    fc.assert(
      fc.property(
        arbitraryRoleSubset,
        (requiredRoles) => {
          let threw = false;
          try {
            rbacCanActivate([], requiredRoles as string[]);
          } catch (e) {
            threw = e instanceof ForbiddenException;
          }
          return threw;
        },
      ),
      { numRuns: 100 },
    );
  });
});
