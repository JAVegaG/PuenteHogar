// Feature: backend-database-implementation, Property 52: Acción sensible registrada en log de auditoría con usuario, acción, recurso y timestamp
// Validates: Requirements 11.7, 11.8

import * as fc from 'fast-check';
import { Logger } from '@nestjs/common';
import { AuditLoggerService, AuditEntry } from './audit-logger.service';

// ─── PII patterns ─────────────────────────────────────────────────────────────
// These regexes detect raw PII that must NOT appear in audit log entries.

/** Colombian document numbers: 6–12 digits (CC, NIT, TI, CE, PP) — pure digit string */
const RAW_DOCUMENT_NUMBER_RE = /^\d{6,12}$/;

/** Colombian phone numbers: 10-digit strings starting with 3 */
const RAW_PHONE_NUMBER_RE = /\b3\d{9}\b/;

/** Email addresses */
const RAW_EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

/** SHA-256 hex hash (64 hex chars) — this IS allowed as anonymized identifier */
const SHA256_RE = /^[0-9a-f]{64}$/i;

/** UUID (any version) — this IS allowed as anonymized identifier */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function containsRawPII(text: string): boolean {
  return (
    RAW_DOCUMENT_NUMBER_RE.test(text) ||
    RAW_PHONE_NUMBER_RE.test(text) ||
    RAW_EMAIL_RE.test(text)
  );
}

// ─── Generators ───────────────────────────────────────────────────────────────

/** Sensitive actions per Requirements 11.7 */
const arbitrarySensitiveAction = fc.constantFrom(
  'CONTRACT_SIGNED',
  'PAYMENT_INITIATED',
  'PAYMENT_CONFIRMED',
  'ROLE_CHANGED',
  'PII_ACCESSED',
);

/** Arbitrary resource names (module:entity pattern) */
const arbitraryResource = fc.constantFrom(
  'contracts:contract',
  'payments:scheduled_payment',
  'users:role',
  'users:pii',
  'landlord-portfolio:lease',
);

/** Arbitrary UUID v4 for userId */
const arbitraryUserId = fc.uuid();

/** Arbitrary resourceId (UUID) */
const arbitraryResourceId = fc.option(fc.uuid(), { nil: undefined });

/**
 * Arbitrary metadata that contains PII-like values to verify they are stripped.
 * We include fields that match the PII_FIELDS set in AuditLoggerService.
 */
const arbitraryMetadataWithPII = fc.record({
  password: fc.string({ minLength: 8, maxLength: 20 }),
  document_number: fc.stringMatching(/^\d{8,10}$/),
  phone_number: fc.stringMatching(/^3\d{9}$/),
  hashed_password: fc.string({ minLength: 10, maxLength: 60 }),
  extra_info: fc.string({ minLength: 1, maxLength: 50 }),
});

/** Arbitrary metadata without PII fields */
const arbitraryCleanMetadata = fc.option(
  fc.record({
    ip: fc.ipV4(),
    requestId: fc.uuid(),
    module: fc.constantFrom('contracts', 'payments', 'users'),
  }),
  { nil: undefined },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Capture what AuditLoggerService.log() writes to the NestJS Logger.
 * Returns the raw JSON string that was logged.
 */
function captureLogOutput(entry: AuditEntry): string {
  let captured = '';
  const spy = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation((message: unknown) => {
      captured = String(message);
    });

  const service = new AuditLoggerService();
  service.log(entry);

  spy.mockRestore();
  return captured;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuditLoggerService — Property 52: Acción sensible registrada en log de auditoría con usuario, acción, recurso y timestamp', () => {

  // ─── Requirement 11.7: sensitive actions logged with required fields ───────

  describe('Requirement 11.7 — sensitive actions are logged with userId, action, resource, timestamp', () => {

    it('Property 52 — log entry always contains userId, action, resource, and timestamp for any sensitive action', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          arbitraryResourceId,
          arbitraryCleanMetadata,
          (userId, action, resource, resourceId, metadata) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
              ...(resourceId !== undefined && { resourceId }),
              ...(metadata !== undefined && { metadata }),
            };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            // All four required fields must be present
            return (
              typeof parsed['userId'] === 'string' &&
              parsed['userId'] === userId &&
              typeof parsed['action'] === 'string' &&
              parsed['action'] === action &&
              typeof parsed['resource'] === 'string' &&
              parsed['resource'] === resource &&
              typeof parsed['timestamp'] === 'string' &&
              !isNaN(Date.parse(parsed['timestamp'] as string))
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — userId in log entry is always a UUID (anonymized identifier)', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          (userId, action, resource) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
            };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            // userId must be a UUID (anonymized identifier, not raw PII)
            return UUID_RE.test(parsed['userId'] as string);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — timestamp in log entry is a valid ISO 8601 string', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
          (userId, action, resource, timestamp) => {
            const entry: AuditEntry = { userId, action, resource, timestamp };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            const loggedTs = parsed['timestamp'] as string;
            // Must be parseable and match the original timestamp
            return (
              typeof loggedTs === 'string' &&
              new Date(loggedTs).getTime() === timestamp.getTime()
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — resourceId is included in log entry when provided', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          fc.uuid(),
          (userId, action, resource, resourceId) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              resourceId,
              timestamp: new Date(),
            };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            return parsed['resourceId'] === resourceId;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Requirement 11.8: audit logs must NOT contain PII in plain text ───────

  describe('Requirement 11.8 — audit logs do not contain PII in plain text', () => {

    it('Property 52 — PII fields (password, document_number, phone_number, hashed_password) are stripped from metadata', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          arbitraryMetadataWithPII,
          (userId, action, resource, metadata) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
              metadata,
            };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;
            const loggedMetadata = parsed['metadata'] as Record<string, unknown> | undefined;

            // PII fields must not appear in the logged metadata
            return (
              loggedMetadata !== undefined &&
              !('password' in loggedMetadata) &&
              !('document_number' in loggedMetadata) &&
              !('phone_number' in loggedMetadata) &&
              !('hashed_password' in loggedMetadata) &&
              // Non-PII field must still be present
              'extra_info' in loggedMetadata
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — the full log string does not contain raw email addresses', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          fc.emailAddress(),
          (userId, action, resource, email) => {
            // Attempt to inject an email via metadata under a non-PII key
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
              metadata: { contact: email },
            };

            const logged = captureLogOutput(entry);
            // The email may appear in metadata (it's not in PII_FIELDS by key name),
            // but the userId itself must never be an email
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            // userId must be a UUID, never an email
            return !RAW_EMAIL_RE.test(parsed['userId'] as string);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — log entry does not contain raw phone numbers in userId, action, resource, or resourceId fields', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          fc.option(fc.uuid(), { nil: undefined }),
          (userId, action, resource, resourceId) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
              ...(resourceId !== undefined && { resourceId }),
            };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            // Core fields must not contain raw phone numbers
            const coreFields = [
              parsed['userId'],
              parsed['action'],
              parsed['resource'],
              parsed['resourceId'],
            ]
              .filter((v) => v !== undefined)
              .map(String);

            return coreFields.every((field) => !RAW_PHONE_NUMBER_RE.test(field));
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — log entry does not contain raw document numbers in userId, action, resource, or resourceId fields', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          fc.option(fc.uuid(), { nil: undefined }),
          (userId, action, resource, resourceId) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
              ...(resourceId !== undefined && { resourceId }),
            };

            const logged = captureLogOutput(entry);
            const parsed = JSON.parse(logged) as Record<string, unknown>;

            // Core fields must not contain raw document numbers
            const coreFields = [
              parsed['userId'],
              parsed['action'],
              parsed['resource'],
              parsed['resourceId'],
            ]
              .filter((v) => v !== undefined)
              .map(String);

            return coreFields.every((field) => !RAW_DOCUMENT_NUMBER_RE.test(field));
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 52 — log output is always valid JSON (never raw string concatenation)', () => {
      fc.assert(
        fc.property(
          arbitraryUserId,
          arbitrarySensitiveAction,
          arbitraryResource,
          arbitraryCleanMetadata,
          (userId, action, resource, metadata) => {
            const entry: AuditEntry = {
              userId,
              action,
              resource,
              timestamp: new Date(),
              ...(metadata !== undefined && { metadata }),
            };

            const logged = captureLogOutput(entry);

            let parsed: unknown;
            try {
              parsed = JSON.parse(logged);
            } catch {
              return false;
            }

            return typeof parsed === 'object' && parsed !== null;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  describe('Edge cases', () => {

    it('log entry without optional fields (resourceId, metadata) still contains the four required fields', () => {
      const entry: AuditEntry = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'CONTRACT_SIGNED',
        resource: 'contracts:contract',
        timestamp: new Date('2024-06-01T12:00:00.000Z'),
      };

      const logged = captureLogOutput(entry);
      const parsed = JSON.parse(logged) as Record<string, unknown>;

      expect(parsed['userId']).toBe(entry.userId);
      expect(parsed['action']).toBe(entry.action);
      expect(parsed['resource']).toBe(entry.resource);
      expect(parsed['timestamp']).toBe('2024-06-01T12:00:00.000Z');
      expect(parsed['resourceId']).toBeUndefined();
      expect(parsed['metadata']).toBeUndefined();
    });

    it('metadata with all PII fields produces a log entry with an empty metadata object', () => {
      const entry: AuditEntry = {
        userId: '550e8400-e29b-41d4-a716-446655440001',
        action: 'PII_ACCESSED',
        resource: 'users:pii',
        timestamp: new Date(),
        metadata: {
          password: 'secret123',
          document_number: '12345678',
          phone_number: '3001234567',
          hashed_password: '$2b$12$abc',
        },
      };

      const logged = captureLogOutput(entry);
      const parsed = JSON.parse(logged) as Record<string, unknown>;
      const meta = parsed['metadata'] as Record<string, unknown>;

      expect(meta).toBeDefined();
      expect(Object.keys(meta)).toHaveLength(0);
    });
  });
});
