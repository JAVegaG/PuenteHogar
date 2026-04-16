// Feature: backend-database-implementation, Property 4: Login con credenciales válidas retorna JWT con rol e id
// Validates: Requirements 1.4

import * as fc from 'fast-check';
import { LoginUseCase } from './login.use-case';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import type { IPasswordHasher } from '@modules/users/domain/ports/password-hasher.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

// ─── Generators ──────────────────────────────────────────────────────────────

const USER_TYPES = ['LANDLORD', 'TENANT'] as const;

/** Arbitrary valid email */
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

/** Arbitrary valid login credentials */
const arbitraryValidCredentials = fc.record({
  mail: arbitraryEmail,
  password: arbitraryPassword,
  role: fc.constantFrom(...USER_TYPES),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMocks(mail: string, role: string) {
  const userId = 'user-' + Math.random().toString(36).slice(2);
  const hashedPassword = 'hashed-password-value';

  const userEntity = new UserEntity(
    userId,
    mail,
    hashedPassword,
    [role],
    true,
    role,
    'doc-type-id-1',
    'encrypted-doc',
    'encrypted-phone',
  );

  const userRepository: IUserRepository = {
    findByMail: async () => userEntity,
    findById: async () => null,
    findRoleByName: async (name: string) => ({ id: 'role-id-1', name }),
    findDocumentTypeByCode: async (code: string) => ({ id: 'doc-type-id-1', code }),
    findAllDocumentTypes: async () => [],
    create: async () => userEntity,
  };

  const passwordHasher: IPasswordHasher = {
    hash: async () => hashedPassword,
    compare: async () => true,
  };

  const auditLogger = {
    log: () => undefined,
    logFailedLogin: () => undefined,
  } as unknown as AuditLoggerService;

  // Mock JwtService: sign returns a deterministic fake JWT string
  const fakeToken = `header.${Buffer.from(JSON.stringify({ sub: userId, roles: [role] })).toString('base64')}.signature`;
  const jwtService = {
    sign: () => fakeToken,
  } as unknown as JwtService;

  return { userRepository, passwordHasher, auditLogger, jwtService, userEntity, fakeToken };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginUseCase — Property 4: Login con credenciales válidas retorna JWT con rol e id', () => {
  /**
   * Property 4 — Validates: Requirements 1.4
   *
   * For any valid registered user with correct credentials (email + password),
   * the LoginUseCase must return an AuthTokenDto that contains:
   *   1. A non-empty JWT access token string
   *   2. The user's ID (non-empty string)
   *   3. The user's role(s) (non-empty array)
   */
  it('login con credenciales válidas retorna JWT con rol e id', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidCredentials, async ({ mail, password, role }) => {
        // Arrange
        const { userRepository, passwordHasher, auditLogger, jwtService, userEntity, fakeToken } =
          buildMocks(mail, role);

        const useCase = new LoginUseCase(
          userRepository,
          passwordHasher,
          jwtService,
          auditLogger,
        );

        // Act
        const result = await useCase.execute({ mail, password }, '127.0.0.1');

        // Assert: accessToken is a non-empty string
        if (!result.accessToken || result.accessToken.trim().length === 0) return false;

        // Assert: accessToken matches what JwtService.sign returned
        if (result.accessToken !== fakeToken) return false;

        // Assert: userId matches the user entity's id
        if (result.userId !== userEntity.id) return false;

        // Assert: roles is a non-empty array containing the user's role
        if (!Array.isArray(result.roles) || result.roles.length === 0) return false;
        if (!result.roles.includes(role)) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
