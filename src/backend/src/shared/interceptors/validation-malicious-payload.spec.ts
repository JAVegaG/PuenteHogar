// Feature: backend-database-implementation, Property 9: Payloads maliciosos son sanitizados o rechazados en el boundary de la API
// Validates: Requirements 1.9, 11.6

import * as fc from 'fast-check';
import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';

/**
 * We test the sanitizeValue logic extracted from ValidationInterceptor directly.
 * The interceptor mutates request.body in-place before passing to the handler.
 *
 * Strategy: for any payload containing SQL injection or XSS patterns, after
 * passing through the interceptor the output must NOT contain those patterns.
 */

// ─── Replicate sanitizeValue from the interceptor (white-box unit test) ───────
// We inline the same patterns and logic to test the invariant independently.

const SQL_PATTERNS = [
  /--/g,
  /\/\*/g,
  /\*\//g,
  /xp_/gi,
  /UNION\s+SELECT/gi,
  /DROP\s+TABLE/gi,
  /INSERT\s+INTO/gi,
  /DELETE\s+FROM/gi,
  /UPDATE\s+\w+\s+SET/gi,
];

const XSS_PATTERNS = [/<script\b[^>]*>/gi, /<\/script>/gi];

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    for (const pattern of SQL_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeValue(val);
    }
    return result;
  }
  return value;
}

// ─── Helper: build a mock NestJS ExecutionContext with a given body ───────────

function buildMockContext(body: Record<string, unknown>): ExecutionContext {
  const request = { body };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function buildMockHandler(): CallHandler {
  return { handle: () => of(null) };
}

// ─── Import the real interceptor ──────────────────────────────────────────────

import { ValidationInterceptor } from './validation.interceptor';

// ─── Generators ───────────────────────────────────────────────────────────────

/** SQL injection pattern strings */
const SQL_INJECTION_STRINGS = [
  "' OR 1=1 --",
  "'; DROP TABLE users; --",
  '1 UNION SELECT * FROM users',
  '/* comment */ SELECT 1',
  'xp_cmdshell',
  'DELETE FROM users WHERE 1=1',
  "INSERT INTO users VALUES ('x')",
  'UPDATE users SET password = 1',
  '1=1 --',
  '-- comment',
  '/* injected */',
];

/** XSS pattern strings */
const XSS_STRINGS = [
  '<script>alert(1)</script>',
  '<script src="evil.js">',
  '</script>',
  '<SCRIPT>alert(1)</SCRIPT>',
  '<script type="text/javascript">evil()</script>',
];

/** Arbitrary SQL injection string */
const arbitrarySqlInjection = fc.constantFrom(...SQL_INJECTION_STRINGS);

/** Arbitrary XSS string */
const arbitraryXssString = fc.constantFrom(...XSS_STRINGS);

/** Arbitrary malicious string (SQL or XSS) */
const arbitraryMaliciousString = fc.oneof(arbitrarySqlInjection, arbitraryXssString);

/**
 * arbitraryMaliciousPayload — generates a flat object where at least one field
 * contains a malicious string (SQL injection or XSS pattern).
 */
function arbitraryMaliciousPayload(): fc.Arbitrary<Record<string, unknown>> {
  return fc.record({
    name: arbitraryMaliciousString,
    description: fc.oneof(arbitraryMaliciousString, fc.string()),
    extra: fc.string(),
  });
}

// ─── Detection helpers ────────────────────────────────────────────────────────

/** Returns true if the string contains any SQL injection pattern */
function containsSqlInjection(s: string): boolean {
  return SQL_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(s);
  });
}

/** Returns true if the string contains any XSS pattern */
function containsXss(s: string): boolean {
  return XSS_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(s);
  });
}

/** Returns true if the string contains any malicious pattern */
function containsMalicious(s: string): boolean {
  return containsSqlInjection(s) || containsXss(s);
}

/** Recursively collect all string values from an object */
function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ValidationInterceptor — Property 9: Payloads maliciosos son sanitizados o rechazados', () => {
  const interceptor = new ValidationInterceptor();

  // ─── Structural unit tests ─────────────────────────────────────────────────

  it('sanitizes SQL injection: -- comment stripped', () => {
    const result = sanitizeValue("hello -- world") as string;
    expect(result).not.toContain('--');
  });

  it('sanitizes SQL injection: UNION SELECT stripped', () => {
    const result = sanitizeValue('1 UNION SELECT * FROM users') as string;
    expect(containsSqlInjection(result)).toBe(false);
  });

  it('sanitizes SQL injection: DROP TABLE stripped', () => {
    const result = sanitizeValue("'; DROP TABLE users; --") as string;
    expect(containsSqlInjection(result)).toBe(false);
  });

  it('sanitizes XSS: <script> tag stripped', () => {
    const result = sanitizeValue('<script>alert(1)</script>') as string;
    expect(containsXss(result)).toBe(false);
  });

  it('sanitizes XSS: <SCRIPT> (uppercase) stripped', () => {
    const result = sanitizeValue('<SCRIPT>evil()</SCRIPT>') as string;
    expect(containsXss(result)).toBe(false);
  });

  it('sanitizes nested object fields', () => {
    const input = { user: { name: '<script>alert(1)</script>', bio: "' OR 1=1 --" } };
    const result = sanitizeValue(input) as typeof input;
    expect(containsXss(result.user.name)).toBe(false);
    expect(containsSqlInjection(result.user.bio)).toBe(false);
  });

  it('sanitizes array elements', () => {
    const input = ['<script>x</script>', "' OR 1=1 --", 'safe'];
    const result = sanitizeValue(input) as string[];
    result.forEach((s) => expect(containsMalicious(s)).toBe(false));
  });

  it('passes through safe strings unchanged', () => {
    const safe = 'Hello, world! This is a normal string.';
    expect(sanitizeValue(safe)).toBe(safe);
  });

  it('passes through non-string primitives unchanged', () => {
    expect(sanitizeValue(42)).toBe(42);
    expect(sanitizeValue(true)).toBe(true);
    expect(sanitizeValue(null)).toBe(null);
  });

  // ─── Interceptor integration tests ────────────────────────────────────────

  it('interceptor mutates request.body — SQL injection stripped', () => {
    const body = { query: "' OR 1=1 --", name: 'test' };
    const ctx = buildMockContext(body);
    interceptor.intercept(ctx, buildMockHandler());
    const mutatedBody = ctx.switchToHttp().getRequest<{ body: Record<string, unknown> }>().body;
    expect(containsSqlInjection(mutatedBody['query'] as string)).toBe(false);
  });

  it('interceptor mutates request.body — XSS stripped', () => {
    const body = { content: '<script>alert(1)</script>', title: 'ok' };
    const ctx = buildMockContext(body);
    interceptor.intercept(ctx, buildMockHandler());
    const mutatedBody = ctx.switchToHttp().getRequest<{ body: Record<string, unknown> }>().body;
    expect(containsXss(mutatedBody['content'] as string)).toBe(false);
  });

  // ─── Property 9: PBT — all malicious payloads are sanitized ───────────────

  it('Property 9 — arbitrary malicious payload: no SQL injection patterns survive sanitization', () => {
    fc.assert(
      fc.property(
        arbitraryMaliciousPayload(),
        (payload) => {
          const sanitized = sanitizeValue(payload);
          const strings = collectStrings(sanitized);
          return strings.every((s) => !containsSqlInjection(s));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9 — arbitrary malicious payload: no XSS patterns survive sanitization', () => {
    fc.assert(
      fc.property(
        arbitraryMaliciousPayload(),
        (payload) => {
          const sanitized = sanitizeValue(payload);
          const strings = collectStrings(sanitized);
          return strings.every((s) => !containsXss(s));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9 — interceptor: no malicious patterns in request.body after intercept', () => {
    fc.assert(
      fc.property(
        arbitraryMaliciousPayload(),
        (payload) => {
          const ctx = buildMockContext(payload);
          interceptor.intercept(ctx, buildMockHandler());
          const mutatedBody = ctx.switchToHttp().getRequest<{ body: Record<string, unknown> }>().body;
          const strings = collectStrings(mutatedBody);
          return strings.every((s) => !containsMalicious(s));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9 — sanitization is idempotent: applying twice yields same result as once', () => {
    fc.assert(
      fc.property(
        arbitraryMaliciousPayload(),
        (payload) => {
          const once = sanitizeValue(payload);
          const twice = sanitizeValue(once);
          return JSON.stringify(once) === JSON.stringify(twice);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9 — safe payloads pass through interceptor without modification', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/),
          value: fc.nat(),
        }),
        (payload) => {
          const ctx = buildMockContext(payload as Record<string, unknown>);
          interceptor.intercept(ctx, buildMockHandler());
          const mutatedBody = ctx.switchToHttp().getRequest<{ body: Record<string, unknown> }>().body;
          // Safe payloads should not be altered
          return (
            mutatedBody['name'] === payload.name &&
            mutatedBody['value'] === payload.value
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
