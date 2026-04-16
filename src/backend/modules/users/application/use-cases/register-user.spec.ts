// Feature: backend-database-implementation, Property 1: Registro de usuario con datos válidos crea cuenta con rol asignado
// Validates: Requirements 1.1

import * as fc from 'fast-check';
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

/** Arbitrary valid email */
const arbitraryEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'co', 'net', 'org'),
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

/** Arbitrary password with at least 8 characters */
const arbitraryPassword = fc.string({ minLength: 8, maxLength: 30 }).filter(
  (s) => s.trim().length >= 8,
);

/** Arbitrary 10-digit phone number */
const arbitraryPhone = fc
  .tuple(
    fc.integer({ min: 3, max: 3 }),
    fc.integer({ min: 100000000, max: 999999999 }),
  )
  .map(([prefix, rest]) => `${prefix}${rest}`);

/** Arbitrary non-empty string (document number, names, etc.) */
const arbitraryNonEmpty = fc.string({ minLength: 1, maxLength: 30 }).filter(
  (s) => s.trim().length > 0,
);

/** Arbitrary natural person details */
const arbitraryNaturalDetails = fc.record({
  firstName: arbitraryNonEmpty,
  lastName: arbitraryNonEmpty,
  preferredName: fc.option(arbitraryNonEmpty, { nil: undefined }),
});

/** Arbitrary legal person details */
const arbitraryLegalDetails = fc.record({
  businessName: arbitraryNonEmpty,
});

/** Arbitrary valid RegisterUserDto — covers both natural and legal person types */
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

function buildMocks(dto: RegisterUserDto) {
  const userId = 'user-' + Math.random().toString(36).slice(2);

  const userEntity = new UserEntity(
    userId,
    dto.mail,
    'hashed-password',
    [dto.role],
    true,
    dto.userType,
    'doc-type-id-1',
    'encrypted-doc',
    'encrypted-phone',
  );

  const userRepository: IUserRepository = {
    findByMail: async () => null,
    findById: async () => null,
    findRoleByName: async (name: string) => ({ id: 'role-id-1', name }),
    findDocumentTypeByCode: async (code: string) => ({ id: 'doc-type-id-1', code }),
    findAllDocumentTypes: async () => [],
    create: async () => userEntity,
  };

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

  return { userRepository, passwordHasher, piiEncryptor, auditLogger, userEntity };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterUserUseCase — Property 1: Registro de usuario con datos válidos crea cuenta con rol asignado', () => {
  /**
   * Property 1 — Validates: Requirements 1.1
   *
   * For any valid user registration data, the use case must:
   *   1. Return a non-empty userId string
   *   2. Return a success message
   *   3. Have called create on the repository with the correct userType
   */
  it('registro con datos válidos crea cuenta con rol asignado', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryValidUser(), async (dto) => {
        // Arrange
        const { userRepository, passwordHasher, piiEncryptor, auditLogger, userEntity } =
          buildMocks(dto);

        let capturedCreateData: Parameters<IUserRepository['create']>[0] | undefined;
        const trackingRepo: IUserRepository = {
          ...userRepository,
          create: async (data) => {
            capturedCreateData = data;
            return userEntity;
          },
        };

        const useCase = new RegisterUserUseCase(
          trackingRepo,
          passwordHasher,
          piiEncryptor,
          auditLogger,
        );

        // Act
        const result = await useCase.execute(dto);

        // Assert: result has userId (non-empty string) and message
        if (!result.userId || result.userId.trim().length === 0) return false;
        if (!result.message || result.message.trim().length === 0) return false;

        // Assert: create was called with the correct userType
        if (!capturedCreateData) return false;
        if (capturedCreateData.userType !== dto.userType) return false;

        // Assert: create was called with the correct personType
        if (capturedCreateData.personType !== dto.personType) return false;

        // Assert: role was assigned (roleId is non-empty)
        if (!capturedCreateData.roleId || capturedCreateData.roleId.trim().length === 0) {
          return false;
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
