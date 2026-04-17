// Feature: backend-database-implementation, Property 5: Credenciales incorrectas retornan 401 con mensaje genérico
// Validates: Requirements 1.5

import * as fc from 'fast-check';
import { UnauthorizedException } from '@nestjs/common';
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

/**
 * Scenario A: non-existent email (user not found in repository).
 * The repository returns null for any email lookup.
 */
const arbitraryNonExistentEmailScenario = fc.record({
  mail: arbitraryEmail,
  password: arbitraryPassword,
  scenario: fc.constant('non-existent-email' as const),
});

/**
 * Scenario B: existing user but wrong password.
 * The repository returns a valid user, but the password hasher returns false.
 */
const arbitraryWrongPasswordScenario = fc.record({
  mail: arbitraryEmail,
  password: arbitraryPassword,
  scenario: fc.constant('wrong-password' as const),
});

/**
 * Scenario C: both wrong email and wrong password (non-existent user + any password).
 * Functionally identical to Scenario A from the use-case perspective, but
 * explicitly tests the combined case.
 */
const arbitraryBothWrongScenario = fc.record({
  mail: arbitraryEmail,
  password: arbitraryPassword,
  scenario: fc.constant('both-wrong' as const),
});

/** Union of all invalid credential scenarios */
const arbitraryInvalidCredentials = fc.oneof(
  arbitraryNonExistentEmailScenario,
  arbitraryWrongPasswordScenario,
  arbitraryBothWrongScenario,
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMocksForScenario(
  mail: string,
  scenario: 'non-existent-email' | 'wrong-password' | 'both-wrong',
) {
  const auditLogger = {
    log: () => undefined,
    logFailedLogin: () => undefined,
  } as unknown as AuditLoggerService;

  const jwtService = {
    sign: () => 'should-never-be-called',
  } as unknown as JwtService;

  if (scenario === 'non-existent-email' || scenario === 'both-wrong') {
    // User does not exist — repository returns null
    const userRepository: IUserRepository = {
      findByMail: async () => null,
      findById: async () => null,
      findRoleByName: async (name: string) => ({ id: 'role-id', name }),
      findDocumentTypeByCode: async (code: string) => ({ id: 'doc-id', code }),
      findAllDocumentTypes: async () => [],
    findDisplayName: async () => null,
      create: async () => {
        throw new Error('should not be called');
      },
    };

    const passwordHasher: IPasswordHasher = {
      hash: async (p: string) => p,
      compare: async () => false,
    };

    return { userRepository, passwordHasher, auditLogger, jwtService };
  }

  // scenario === 'wrong-password': user exists but password does not match
  const existingUser = new UserEntity(
    'user-id-123',
    mail,
    'stored-hashed-password',
    ['TENANT'],
    true,
    'TENANT',
    'doc-type-id-1',
    'encrypted-doc',
    'encrypted-phone',
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
  };

  // Password hasher always returns false — wrong password
  const passwordHasher: IPasswordHasher = {
    hash: async (p: string) => p,
    compare: async () => false,
  };

  return { userRepository, passwordHasher, auditLogger, jwtService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginUseCase — Property 5: Credenciales incorrectas retornan 401 con mensaje genérico', () => {
  /**
   * Property 5 — Validates: Requirements 1.5
   *
   * For any combination of incorrect credentials (non-existent email,
   * wrong password, or both), the LoginUseCase must:
   *   1. Throw an UnauthorizedException (HTTP 401)
   *   2. Return a generic error message that does NOT reveal which field
   *      (email or password) is incorrect — preventing user enumeration attacks.
   *
   * The message must NOT contain field-specific hints such as:
   *   - "correo no encontrado" / "email not found"
   *   - "contraseña incorrecta" / "wrong password"
   *   - "usuario no existe" / "user does not exist"
   */
  it('credenciales incorrectas lanzan UnauthorizedException con mensaje genérico', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryInvalidCredentials, async ({ mail, password, scenario }) => {
        // Arrange
        const { userRepository, passwordHasher, auditLogger, jwtService } =
          buildMocksForScenario(mail, scenario);

        const useCase = new LoginUseCase(
          userRepository,
          passwordHasher,
          jwtService,
          auditLogger,
        );

        // Act & Assert: must throw UnauthorizedException
        let thrownError: unknown;
        try {
          await useCase.execute({ mail, password }, '127.0.0.1');
          // If no exception is thrown, the property fails
          return false;
        } catch (err) {
          thrownError = err;
        }

        // Must be an UnauthorizedException (HTTP 401)
        if (!(thrownError instanceof UnauthorizedException)) return false;

        // The message must be generic — must NOT reveal which field is wrong.
        // Forbidden phrases that would reveal field-specific information:
        const forbiddenPhrases = [
          'correo no encontrado',
          'email not found',
          'usuario no existe',
          'user not found',
          'user does not exist',
          'contraseña incorrecta',
          'wrong password',
          'password incorrect',
          'invalid password',
          'invalid email',
          'correo incorrecto',
        ];

        const message =
          typeof thrownError.message === 'string'
            ? thrownError.message.toLowerCase()
            : '';

        for (const phrase of forbiddenPhrases) {
          if (message.includes(phrase.toLowerCase())) return false;
        }

        // The message must be non-empty (a generic message must exist)
        if (message.trim().length === 0) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
