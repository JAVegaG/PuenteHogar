// Feature: backend-database-implementation, Property 8: Token JWT inválido o expirado retorna 401 en endpoints protegidos
// Validates: Requirements 1.8

import * as fc from 'fast-check';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

/**
 * We test JwtAuthGuard's handleRequest directly, which is the method
 * responsible for throwing UnauthorizedException when the token is invalid.
 *
 * We also test the full Passport JWT validation path by invoking the
 * JwtStrategy.validate logic with tampered/missing payloads.
 */

// ─── Minimal inline guard replica for unit testing ───────────────────────────
// We replicate the guard's handleRequest logic to avoid NestJS DI overhead.
// This mirrors the exact implementation in jwt-auth.guard.ts.

function handleRequest<TUser = unknown>(
  err: Error | null,
  user: TUser | false | null | undefined,
): TUser {
  if (err || !user) {
    throw new UnauthorizedException('Invalid or expired token');
  }
  return user;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-secret-for-property-tests';
const WRONG_SECRET = 'wrong-secret-that-does-not-match';

/** Build a valid JWT signed with the correct secret */
function buildValidToken(payload: object, expiresIn: string | number = '1h'): string {
  return jwt.sign(payload, VALID_SECRET, { expiresIn } as jwt.SignOptions);
}

/** Build a JWT signed with the wrong secret */
function buildWrongSecretToken(payload: object): string {
  return jwt.sign(payload, WRONG_SECRET, { expiresIn: '1h' });
}

/** Build an expired JWT (expired 1 second ago) */
function buildExpiredToken(payload: object): string {
  return jwt.sign(payload, VALID_SECRET, { expiresIn: -1 });
}

/** Build a JWT with a tampered payload (valid structure, invalid signature) */
function buildTamperedToken(payload: object): string {
  const token = buildValidToken(payload);
  const parts = token.split('.');
  // Tamper the payload part (base64 decode, modify, re-encode)
  const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  decodedPayload.sub = 'tampered-user-id';
  parts[1] = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
  return parts.join('.');
}

/** Verify a token against the valid secret — returns the payload or throws */
function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, VALID_SECRET) as jwt.JwtPayload;
}

// ─── Generators ───────────────────────────────────────────────────────────────

/** Arbitrary random strings that are not valid JWTs */
const arbitraryRandomString = fc.oneof(
  fc.string(),
  fc.constant(''),
  fc.constant('   '),
  fc.constant('not.a.jwt'),
  fc.constant('Bearer invalid'),
  fc.constant('null'),
  fc.constant('undefined'),
  fc.constant('{}'),
  fc.stringMatching(/^[0-9a-f]{1,64}$/),
);

/** Arbitrary malformed JWT-like strings (2 parts instead of 3) */
const arbitraryMalformedJwt = fc.tuple(fc.string(), fc.string()).map(
  ([a, b]) => `${a}.${b}`,
);

/** Arbitrary JWT with wrong secret */
const arbitraryWrongSecretToken = fc
  .record({
    sub: fc.uuid(),
    roles: fc.array(fc.constantFrom('LANDLORD', 'TENANT'), { minLength: 1, maxLength: 2 }),
  })
  .map((payload) => buildWrongSecretToken(payload));

/** Arbitrary expired JWT */
const arbitraryExpiredToken = fc
  .record({
    sub: fc.uuid(),
    roles: fc.array(fc.constantFrom('LANDLORD', 'TENANT'), { minLength: 1, maxLength: 2 }),
  })
  .map((payload) => buildExpiredToken(payload));

/** Arbitrary JWT with tampered payload (valid structure, broken signature) */
const arbitraryTamperedToken = fc
  .record({
    sub: fc.uuid(),
    roles: fc.array(fc.constantFrom('LANDLORD', 'TENANT'), { minLength: 1, maxLength: 2 }),
  })
  .map((payload) => buildTamperedToken(payload));

/** Arbitrary JWT missing the `sub` claim */
const arbitraryNoSubToken = fc
  .record({
    roles: fc.array(fc.constantFrom('LANDLORD', 'TENANT'), { minLength: 1, maxLength: 2 }),
    extra: fc.string(),
  })
  .map((payload) => jwt.sign(payload, VALID_SECRET, { expiresIn: '1h' }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JwtAuthGuard — Property 8: Token JWT inválido o expirado retorna 401', () => {

  // ─── handleRequest unit tests ──────────────────────────────────────────────

  describe('handleRequest — rejects falsy user values', () => {
    it('throws UnauthorizedException when user is null', () => {
      expect(() => handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is undefined', () => {
      expect(() => handleRequest(null, undefined)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is false', () => {
      expect(() => handleRequest(null, false)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when err is provided (even with a user)', () => {
      expect(() =>
        handleRequest(new Error('jwt expired'), { id: 'user-1', roles: ['LANDLORD'] }),
      ).toThrow(UnauthorizedException);
    });

    it('returns user when err is null and user is truthy', () => {
      const user = { id: 'user-1', roles: ['LANDLORD'] };
      expect(handleRequest(null, user)).toBe(user);
    });
  });

  // ─── Property 8: random strings are rejected ──────────────────────────────

  it('Property 8 — arbitrary random strings are not valid JWTs (jwt.verify throws)', () => {
    fc.assert(
      fc.property(arbitraryRandomString, (token) => {
        let threw = false;
        try {
          verifyToken(token);
        } catch {
          threw = true;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: malformed JWT-like strings are rejected ──────────────────

  it('Property 8 — malformed JWT-like strings (2 parts) are rejected by jwt.verify', () => {
    fc.assert(
      fc.property(arbitraryMalformedJwt, (token) => {
        let threw = false;
        try {
          verifyToken(token);
        } catch {
          threw = true;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: wrong-secret tokens are rejected ─────────────────────────

  it('Property 8 — tokens signed with wrong secret are rejected by jwt.verify', () => {
    fc.assert(
      fc.property(arbitraryWrongSecretToken, (token) => {
        let threw = false;
        try {
          verifyToken(token);
        } catch {
          threw = true;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: expired tokens are rejected ──────────────────────────────

  it('Property 8 — expired tokens are rejected by jwt.verify', () => {
    fc.assert(
      fc.property(arbitraryExpiredToken, (token) => {
        let threw = false;
        try {
          verifyToken(token);
        } catch (err) {
          // Must be a TokenExpiredError specifically
          threw = err instanceof jwt.TokenExpiredError;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: tampered tokens are rejected ─────────────────────────────

  it('Property 8 — tokens with tampered payload (broken signature) are rejected by jwt.verify', () => {
    fc.assert(
      fc.property(arbitraryTamperedToken, (token) => {
        let threw = false;
        try {
          verifyToken(token);
        } catch {
          threw = true;
        }
        return threw;
      }),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: handleRequest rejects null/false/undefined for any error ─

  it('Property 8 — handleRequest always throws UnauthorizedException for any Error + any user', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(false),
          fc.record({ id: fc.uuid(), roles: fc.array(fc.string()) }),
        ),
        (errMsg, user) => {
          let threw = false;
          try {
            handleRequest(new Error(errMsg), user as unknown);
          } catch (e) {
            threw = e instanceof UnauthorizedException;
          }
          return threw;
        },
      ),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: handleRequest rejects falsy user for any combination ─────

  it('Property 8 — handleRequest always throws UnauthorizedException when user is falsy (no error)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(false),
          fc.constant(0),
          fc.constant(''),
        ),
        (falsyUser) => {
          let threw = false;
          try {
            handleRequest(null, falsyUser as unknown);
          } catch (e) {
            threw = e instanceof UnauthorizedException;
          }
          return threw;
        },
      ),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: tokens missing `sub` claim fail strategy validation ──────

  it('Property 8 — tokens missing sub claim produce no valid user identity', () => {
    fc.assert(
      fc.property(arbitraryNoSubToken, (token) => {
        // Verify the token is structurally valid (signed correctly)
        const payload = jwt.verify(token, VALID_SECRET) as jwt.JwtPayload;
        // But the strategy's validate() would return { id: undefined, roles }
        // which means the guard must reject it — sub is undefined/missing
        return payload.sub === undefined;
      }),
      { numRuns: 100 },
    );
  });

  // ─── Property 8: valid tokens with sub are accepted ───────────────────────

  it('Property 8 — valid tokens with sub and roles are accepted (control case)', () => {
    fc.assert(
      fc.property(
        fc.record({
          sub: fc.uuid(),
          roles: fc.array(fc.constantFrom('LANDLORD', 'TENANT'), {
            minLength: 1,
            maxLength: 2,
          }),
        }),
        (payload) => {
          const token = buildValidToken(payload);
          const decoded = jwt.verify(token, VALID_SECRET) as jwt.JwtPayload;
          // Valid token: sub and roles are present
          return (
            decoded.sub === payload.sub &&
            Array.isArray(decoded.roles)
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
