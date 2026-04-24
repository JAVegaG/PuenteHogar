// Feature: backend-database-implementation, Property 10: Log de auditoría de login fallido contiene timestamp e IP sin PII
// Validates: Requirements 1.10, 11.8

import * as fc from 'fast-check';
import { UnauthorizedException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import type { IPasswordHasher } from '@modules/users/domain/ports/password-hasher.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

// ─── Generators ──────────────────────────────────────────────────────────────

/** Arbitrary valid-looking email */
const arbitraryEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'co', 'net', 'org'),
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

/** Arbitrary password with at least 8 characters */
const arbitraryPassword = fc
  .string({ minLength: 8, maxLength: 30 })
  .filter((s) => s.trim().length >= 8);

/** Arbitrary IPv4 address */
const arbitraryIPv4 = fc
  .tuple(
    fc.integer({ min: 1, max: 254 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 }),
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** Arbitrary Colombian phone number: exactly 10 digits starting with 3 */
const arbitraryPhoneNumber = fc
  .integer({ min: 3_000_000_000, max: 3_299_999_999 })
  .map((n) => String(n));

/** Arbitrary Colombian document number: 6–12 digits */
const arbitraryDocumentNumber = fc
  .integer({ min: 100_000, max: 999_999_999_999 })
  .map((n) => String(n));

/** Combined arbitrary for a failed login attempt */
const arbitraryFailedLoginAttempt = fc.record({
  mail: arbitraryEmail,
  password: arbitraryPassword,
  ip: arbitraryIPv4,
  documentNumber: arbitraryDocumentNumber,
  phoneNumber: arbitraryPhoneNumber,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds mocks for a failed login scenario where the user exists but the
 * password does not match. This ensures the audit log is always triggered.
 * The user entity stores documentNumber and phoneNumber as PII fields.
 */
function buildMocksForFailedLogin(
  mail: string,
  documentNumber: string,
  phoneNumber: string,
): { userRepository: IUserRepository; passwordHasher: IPasswordHasher } {
  const existingUser = new UserEntity(
    'user-id-123',
    mail,
    'stored-hashed-password',
    ['TENANT'],
    true,
    'TENANT',
    'doc-type-id-1',
    documentNumber,   // PII: document number
    phoneNumber,      // PII: phone number
  );

  const userRepository: IUserRepository = {
    findByMail: async () => existingUser,
    findById: async () => null,
    findRoleByName: async (name: string) => ({ id: 'role-id', name }),
    findDocumentTypeByCode: async (code: string) => ({ id: 'doc-id', code }),
    findAllDocumentTypes: async () => [],
    findDisplayName: async () => null,
    create: async () => {
      throw new Error('should not be called');
    },
    addRoleToUser: async () => { },
    removeRoleFromUser: async () => { },
    updateUserType: async () => { },
    findUserRoles: async () => [],
    findUserRoleRecord: async () => null,
    hasActiveLeases: async () => false,
    hasActiveContractsAsRole: async () => false,
    hasPendingPayments: async () => false,
    hasPortfoliosWithUnits: async () => false,
    hasActiveLeasesInPortfolios: async () => false,
    countUserRoles: async () => 1,
  };

  // Password hasher always returns false — wrong password triggers audit log
  const passwordHasher: IPasswordHasher = {
    hash: async (p: string) => p,
    compare: async () => false,
  };

  return { userRepository, passwordHasher };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginUseCase — Property 10: Log de auditoría de login fallido contiene timestamp e IP sin PII', () => {
  /**
   * Property 10 — Validates: Requirements 1.10, 11.8
   *
   * For any failed login attempt with arbitrary credentials and IP address,
   * the audit log entry produced by AuditLoggerService.logFailedLogin must:
   *   1. Be called exactly once (audit log is always triggered on failure)
   *   2. Produce a log message containing a timestamp (ISO string)
   *   3. Produce a log message containing the IP address of the request
   *   4. NOT produce a log message containing the raw email address (PII)
   *   5. NOT produce a log message containing the raw password (PII)
   *   6. NOT produce a log message containing the raw document number (PII)
   *   7. NOT produce a log message containing the raw phone number (PII)
   *
   * Per tech.md: "Audit logging for sensitive actions (no PII in logs —
   * identifiers anonymized via sha256)"
   *
   * The real AuditLoggerService is used (not mocked) so that the sha256
   * anonymization logic is exercised. The Logger.warn output is captured
   * via a spy to inspect the actual logged content.
   */
  it('log de auditoría contiene timestamp e IP, sin PII en texto plano', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryFailedLoginAttempt,
        async ({ mail, password, ip, documentNumber, phoneNumber }) => {
          // Arrange: use the real AuditLoggerService so sha256 anonymization runs
          const auditLogger = new AuditLoggerService();

          // Spy on Logger.warn to capture the actual logged output
          const loggedMessages: string[] = [];
          const warnSpy = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation((message: unknown) => {
              loggedMessages.push(String(message));
            });

          const { userRepository, passwordHasher } = buildMocksForFailedLogin(
            mail,
            documentNumber,
            phoneNumber,
          );

          const jwtService = {
            sign: () => 'should-never-be-called',
          } as unknown as JwtService;

          const useCase = new LoginUseCase(
            userRepository,
            passwordHasher,
            jwtService,
            auditLogger,
          );

          let passed = true;

          try {
            // Act: execute should throw UnauthorizedException
            try {
              await useCase.execute({ mail, password }, ip);
              // If no exception is thrown, the property fails
              passed = false;
            } catch (err) {
              if (!(err instanceof UnauthorizedException)) passed = false;
            }

            if (!passed) return false;

            // Assert 1: Logger.warn was called exactly once
            if (loggedMessages.length !== 1) return false;

            const loggedMessage = loggedMessages[0];

            // Parse the JSON log entry
            let logEntry: Record<string, unknown>;
            try {
              logEntry = JSON.parse(loggedMessage) as Record<string, unknown>;
            } catch {
              // If not valid JSON, the log format is wrong
              return false;
            }

            // Assert 2: timestamp is present in the log entry
            if (!logEntry['timestamp']) return false;
            const timestampStr = String(logEntry['timestamp']);
            // Must be a valid ISO date string
            if (isNaN(Date.parse(timestampStr))) return false;

            // Assert 3: IP address is present and matches the request IP
            if (!logEntry['ip']) return false;
            if (logEntry['ip'] !== ip) return false;

            // Assert 4: raw email (PII) is NOT present in the log message
            if (loggedMessage.includes(mail)) return false;

            // Assert 5: raw password (PII) is NOT present in the log message
            if (loggedMessage.includes(password)) return false;

            // Assert 6: raw document number (PII) is NOT present in the log message
            if (loggedMessage.includes(documentNumber)) return false;

            // Assert 7: raw phone number (PII) is NOT present in the log message
            if (loggedMessage.includes(phoneNumber)) return false;

            // Assert 8: userIdentifier field must be present (anonymized, non-empty)
            if (!logEntry['userIdentifier']) return false;
            const anonymizedId = String(logEntry['userIdentifier']);
            if (anonymizedId.trim().length === 0) return false;

            // Assert 9: the anonymized identifier must NOT equal the raw email
            if (anonymizedId === mail) return false;

            return true;
          } finally {
            warnSpy.mockRestore();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b — Validates: Requirements 1.10, 11.8
   *
   * The AuditLoggerService.logFailedLogin method directly must produce
   * a log entry that contains timestamp and IP but no PII fields.
   * This tests the service in isolation without the use case.
   */
  it('AuditLoggerService.logFailedLogin produce entrada con timestamp e IP sin PII', () => {
    fc.assert(
      fc.property(
        fc.record({
          mail: arbitraryEmail,
          ip: arbitraryIPv4,
          documentNumber: arbitraryDocumentNumber,
          phoneNumber: arbitraryPhoneNumber,
        }),
        ({ mail, ip, documentNumber, phoneNumber }) => {
          const auditLogger = new AuditLoggerService();
          const loggedMessages: string[] = [];

          const warnSpy = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation((message: unknown) => {
              loggedMessages.push(String(message));
            });

          try {
            auditLogger.logFailedLogin({
              userIdentifier: mail,
              ip,
              timestamp: new Date(),
            });

            // Must have logged exactly one message
            if (loggedMessages.length !== 1) return false;

            const loggedMessage = loggedMessages[0];

            // Must be valid JSON
            let logEntry: Record<string, unknown>;
            try {
              logEntry = JSON.parse(loggedMessage) as Record<string, unknown>;
            } catch {
              return false;
            }

            // Must contain timestamp
            if (!logEntry['timestamp']) return false;
            if (isNaN(Date.parse(String(logEntry['timestamp'])))) return false;

            // Must contain IP
            if (logEntry['ip'] !== ip) return false;

            // Must NOT contain raw email
            if (loggedMessage.includes(mail)) return false;

            // Must NOT contain raw document number (not passed, but verify no leakage)
            if (loggedMessage.includes(documentNumber)) return false;

            // Must NOT contain raw phone number (not passed, but verify no leakage)
            if (loggedMessage.includes(phoneNumber)) return false;

            // userIdentifier must be anonymized (not equal to raw email)
            const anonymizedId = String(logEntry['userIdentifier']);
            if (anonymizedId === mail) return false;
            if (anonymizedId.trim().length === 0) return false;

            return true;
          } finally {
            warnSpy.mockRestore();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
