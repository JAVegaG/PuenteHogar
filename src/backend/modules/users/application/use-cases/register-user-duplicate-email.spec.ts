// Feature: backend-database-implementation, Property 2: Correo duplicado es rechazado con 409
// Validates: Requirements 1.2

import * as fc from 'fast-check';
import { ConflictException } from '@nestjs/common';
import { RegisterUserUseCase } from './register-user.use-case';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import type { IPasswordHasher } from '@modules/users/domain/ports/password-hasher.port';
import type { IPIIEncryptor } from '@modules/users/domain/ports/pii-encryptor.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import type { RegisterUserDto } from '@modules/users/application/dtos/register-user.dto';

// ─── Generators ──────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_CODES = ['CC', 'NIT', 'CE', 'PP', 'TI'] as const;
const USER_TYPES = ['LANDLORD', 'TENANT'] as const;

const arbitraryEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'co', 'net', 'org'),
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

const arbitraryPassword = fc
  .string({ minLength: 8, maxLength: 30 })
  .filter((s) => s.trim().length >= 8);

const arbitraryPhone = fc
  .tuple(
    fc.integer({ min: 3, max: 3 }),
    fc.integer({ min: 100000000, max: 999999999 }),
  )
  .map(([prefix, rest]) => `${prefix}${rest}`);

const arbitraryNonEmpty = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

const arbitraryNaturalDetails = fc.record({
  firstName: arbitraryNonEmpty,
  lastName: arbitraryNonEmpty,
  preferredName: fc.option(arbitraryNonEmpty, { nil: undefined }),
});

const arbitraryLegalDetails = fc.record({
  businessName: arbitraryNonEmpty,
});

function arbitraryValidUser(): fc.Arbitrary<RegisterUserDto> {
  return fc
    .record({
      mail: arbitraryEmail,
      password: arbitraryPassword,
      phoneNumber: arbitraryPhone,
      documentTypeCode: fc.constantFrom(...DOCUMENT_TYPE_CODES),
      documentNumber: arbitraryNonEmpty,
      userType: fc.constantFrom(...USER_TYPES),
      role: fc.constantFrom(...USER_TYPES),
      personType: fc.constantFrom('natural' as const, 'legal' as const),
      fullName: arbitraryNonEmpty,
    })
    .chain((base): fc.Arbitrary<RegisterUserDto> => {
      if (base.personType === 'natural') {
        return arbitraryNaturalDetails.map((naturalDetails) => ({
          ...base,
          naturalDetails,
          legalDetails: undefined,
        })) as fc.Arbitrary<RegisterUserDto>;
      } else {
        return arbitraryLegalDetails.map((legalDetails) => ({
          ...base,
          legalDetails,
          naturalDetails: undefined,
        })) as fc.Arbitrary<RegisterUserDto>;
      }
    });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSharedMocks() {
  const passwordHasher: IPasswordHasher = {
    hash: async () => 'hashed-password',
    compare: async () => true,
  };

  const piiEncryptor: IPIIEncryptor = {
    encrypt: () => 'encrypted-value',
    decrypt: () => 'decrypted-value',
  };

  const auditLogger = {
    log: () => undefined,
    logFailedLogin: () => undefined,
  } as unknown as AuditLoggerService;

  return { passwordHasher, piiEncryptor, auditLogger };
}

function makeUserEntity(dto: RegisterUserDto): UserEntity {
  return new UserEntity(
    'user-' + Math.random().toString(36).slice(2),
    dto.mail,
    'hashed-password',
    [dto.role],
    true,
    dto.userType,
    'doc-type-id-1',
    'encrypted-doc',
    'encrypted-phone',
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterUserUseCase — Property 2: Correo duplicado es rechazado con 409', () => {
  /**
   * Property 2 — Validates: Requirements 1.2
   *
   * For any valid user registration data, if the same email is used to register
   * twice, the second attempt must be rejected with HTTP 409 ConflictException.
   *
   * The mock simulates:
   *   - First call to findByMail → null (email not yet registered)
   *   - Second call to findByMail → existing UserEntity (email already registered)
   */
  it('correo duplicado es rechazado con 409', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidUser(), async (dto) => {
        const { passwordHasher, piiEncryptor, auditLogger } = buildSharedMocks();
        const existingUser = makeUserEntity(dto);

        // In-memory store to simulate duplicate detection across two registrations
        let callCount = 0;

        const userRepository: IUserRepository = {
          findByMail: async () => {
            // First call: email not yet registered; subsequent calls: already registered
            callCount += 1;
            return callCount === 1 ? null : existingUser;
          },
          findById: async () => null,
          findRoleByName: async (name: string) => ({ id: 'role-id-1', name }),
          findDocumentTypeByCode: async (code: string) => ({ id: 'doc-type-id-1', code }),
          findAllDocumentTypes: async () => [],
          findDisplayName: async () => null,
          create: async () => existingUser,
        };

        const useCase = new RegisterUserUseCase(
          userRepository,
          passwordHasher,
          piiEncryptor,
          auditLogger,
        );

        // First registration must succeed
        const firstResult = await useCase.execute(dto);
        if (!firstResult.userId || firstResult.userId.trim().length === 0) return false;

        // Second registration with the same email must throw ConflictException (409)
        try {
          await useCase.execute(dto);
          // If no exception was thrown, the property fails
          return false;
        } catch (err) {
          return err instanceof ConflictException;
        }
      }),
      { numRuns: 100 },
    );
  });
});
