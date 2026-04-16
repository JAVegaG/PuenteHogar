// Feature: backend-database-implementation, Property 7: Campos PII cifrados en reposo
// Validates: Requirements 1.7, 11.5

import * as fc from 'fast-check';
import { AES256PIIEncryptor } from '@modules/users/infrastructure/adapters/aes256-pii-encryptor.adapter';
import { RegisterUserUseCase } from './register-user.use-case';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import type { IPasswordHasher } from '@modules/users/domain/ports/password-hasher.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import type { RegisterUserDto } from '@modules/users/application/dtos/register-user.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * AES-256-CBC encrypted output format: <iv_hex>:<ciphertext_hex>
 * IV is 16 bytes = 32 hex chars; ciphertext is at least 32 hex chars (one block).
 */
const AES_CBC_FORMAT_REGEX = /^[0-9a-f]{32}:[0-9a-f]{32,}$/i;

/** A deterministic 32-byte key (256-bit) for tests — hex-encoded */
const TEST_KEY_HEX = 'a'.repeat(64); // 64 hex chars = 32 bytes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds an AES256PIIEncryptor with the test key injected via a mock ConfigService */
function buildEncryptor(): AES256PIIEncryptor {
  const configService = {
    get: (_key: string) => TEST_KEY_HEX,
  } as any;
  return new AES256PIIEncryptor(configService);
}

/** Returns true if the string matches the expected AES-CBC ciphertext format */
function isAesCbcCiphertext(value: string): boolean {
  return AES_CBC_FORMAT_REGEX.test(value);
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

interface CapturedPIIFields {
  documentNumber: string;
  phoneNumber: string;
}

function buildRepositoryMock(
  dto: RegisterUserDto,
  captured: CapturedPIIFields,
): IUserRepository {
  return {
    findByMail: async () => null,
    findById: async () => null,
    findRoleByName: async (name: string) => ({ id: 'role-id-1', name }),
    findDocumentTypeByCode: async (code: string) => ({ id: 'doc-type-id-1', code }),
    findAllDocumentTypes: async () => [],
    create: async (data) => {
      captured.documentNumber = data.documentNumber;
      captured.phoneNumber = data.phoneNumber;
      return new UserEntity(
        'user-id-1',
        dto.mail,
        'hashed-password',
        [dto.role],
        true,
        dto.userType,
        'doc-type-id-1',
        data.documentNumber,
        data.phoneNumber,
      );
    },
  };
}

const passwordHasher: IPasswordHasher = {
  hash: async () => 'hashed-password',
  compare: async () => true,
};

const auditLogger = {
  log: () => undefined,
  logFailedLogin: () => undefined,
} as unknown as AuditLoggerService;

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Arbitrary Colombian document number: 6–12 digits */
const arbitraryDocumentNumber = fc
  .integer({ min: 100_000, max: 999_999_999_999 })
  .map((n) => String(n));

/** Arbitrary Colombian phone number: exactly 10 digits starting with 3 */
const arbitraryPhoneNumber = fc
  .integer({ min: 3_000_000_000, max: 3_299_999_999 })
  .map((n) => String(n));

/** Arbitrary non-empty plain-text PII string */
const arbitraryPIIString = fc.string({ minLength: 1, maxLength: 64 }).filter(
  (s) => s.trim().length > 0,
);

/** Minimal valid RegisterUserDto with given document and phone */
function buildDto(documentNumber: string, phoneNumber: string): RegisterUserDto {
  return {
    mail: 'test@example.com',
    password: 'password123',
    phoneNumber,
    documentTypeCode: 'CC',
    documentNumber,
    userType: 'LANDLORD',
    role: 'LANDLORD',
    personType: 'natural',
    fullName: 'Test User',
    naturalDetails: { firstName: 'Test', lastName: 'User', preferredName: undefined },
    legalDetails: undefined,
  } as RegisterUserDto;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AES256PIIEncryptor — Property 7: Campos PII cifrados en reposo', () => {
  const encryptor = buildEncryptor();

  /**
   * Property 7a — Validates: Requirements 1.7, 11.5
   *
   * For any arbitrary PII string, encrypt() must return a value that:
   *   1. Does NOT equal the original plain-text value
   *   2. Matches the AES-CBC ciphertext format (<iv_hex>:<ciphertext_hex>)
   *   3. Contains an IV prefix of exactly 32 hex characters (16 bytes)
   */
  it('encrypt() retorna ciphertext en formato AES-CBC y nunca el valor en texto plano', () => {
    fc.assert(
      fc.property(arbitraryPIIString, (plaintext) => {
        const ciphertext = encryptor.encrypt(plaintext);

        // Must NOT be the original plain-text
        if (ciphertext === plaintext) return false;

        // Must match AES-CBC format: <32-hex-iv>:<hex-ciphertext>
        if (!isAesCbcCiphertext(ciphertext)) return false;

        // IV part must be exactly 32 hex chars (16 bytes)
        const ivPart = ciphertext.split(':')[0];
        if (ivPart.length !== 32) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7b — Validates: Requirements 1.7, 11.5
   *
   * Two calls to encrypt() with the same PII value must produce different
   * ciphertexts (AES-CBC uses a random IV per call), confirming that the
   * stored value is never a deterministic encoding of the plain-text PII.
   */
  it('encrypt() produce ciphertexts distintos para el mismo valor (IV aleatorio)', () => {
    fc.assert(
      fc.property(arbitraryPIIString, (plaintext) => {
        const cipher1 = encryptor.encrypt(plaintext);
        const cipher2 = encryptor.encrypt(plaintext);
        // Different ciphertexts due to random IV
        return cipher1 !== cipher2;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7c — Validates: Requirements 1.7, 11.5
   *
   * For any arbitrary PII string, decrypt(encrypt(value)) must return the
   * original plain-text value (round-trip correctness).
   */
  it('decrypt(encrypt(value)) retorna el valor original (round-trip)', () => {
    fc.assert(
      fc.property(arbitraryPIIString, (plaintext) => {
        const ciphertext = encryptor.encrypt(plaintext);
        const decrypted = encryptor.decrypt(ciphertext);
        return decrypted === plaintext;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7d — Validates: Requirements 1.7, 11.5
   *
   * For any arbitrary Colombian document number, encrypt() must return a
   * ciphertext that does not contain the original digits as a substring.
   * This guards against partial-plaintext leakage in the ciphertext.
   */
  it('ciphertext de número de documento no contiene el número original como substring', () => {
    fc.assert(
      fc.property(arbitraryDocumentNumber, (docNumber) => {
        const ciphertext = encryptor.encrypt(docNumber);
        // The ciphertext (hex-encoded) must not contain the plain digits
        return !ciphertext.includes(docNumber);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7e — Validates: Requirements 1.7, 11.5
   *
   * For any arbitrary Colombian phone number, encrypt() must return a
   * ciphertext that does not contain the original digits as a substring.
   */
  it('ciphertext de número de celular no contiene el número original como substring', () => {
    fc.assert(
      fc.property(arbitraryPhoneNumber, (phone) => {
        const ciphertext = encryptor.encrypt(phone);
        return !ciphertext.includes(phone);
      }),
      { numRuns: 100 },
    );
  });
});

describe('RegisterUserUseCase — Property 7: PII cifrado antes de persistir en repositorio', () => {
  const encryptor = buildEncryptor();

  /**
   * Property 7f — Validates: Requirements 1.7, 11.5
   *
   * For any arbitrary document number and phone number, when
   * RegisterUserUseCase.execute() is called, the values passed to
   * IUserRepository.create() as `documentNumber` and `phoneNumber` must:
   *   1. NOT equal the original plain-text values
   *   2. Match the AES-CBC ciphertext format
   *
   * This verifies that PII is encrypted at the application layer before
   * reaching the persistence layer.
   */
  it('documentNumber y phoneNumber enviados al repositorio son ciphertexts AES-CBC, nunca texto plano', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryDocumentNumber,
        arbitraryPhoneNumber,
        async (documentNumber, phoneNumber) => {
          const dto = buildDto(documentNumber, phoneNumber);
          const captured: CapturedPIIFields = { documentNumber: '', phoneNumber: '' };
          const repo = buildRepositoryMock(dto, captured);

          const useCase = new RegisterUserUseCase(repo, passwordHasher, encryptor, auditLogger);
          await useCase.execute(dto);

          // documentNumber must be encrypted — not plain text
          if (captured.documentNumber === documentNumber) return false;
          if (!isAesCbcCiphertext(captured.documentNumber)) return false;

          // phoneNumber must be encrypted — not plain text
          if (captured.phoneNumber === phoneNumber) return false;
          if (!isAesCbcCiphertext(captured.phoneNumber)) return false;

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7g — Validates: Requirements 1.7, 11.5
   *
   * The encrypted PII values stored in the repository must be decryptable
   * back to the original plain-text values (round-trip via the use case).
   * This confirms that the encryption is reversible and the data is not lost.
   */
  it('PII cifrado en repositorio es descifrable al valor original (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryDocumentNumber,
        arbitraryPhoneNumber,
        async (documentNumber, phoneNumber) => {
          const dto = buildDto(documentNumber, phoneNumber);
          const captured: CapturedPIIFields = { documentNumber: '', phoneNumber: '' };
          const repo = buildRepositoryMock(dto, captured);

          const useCase = new RegisterUserUseCase(repo, passwordHasher, encryptor, auditLogger);
          await useCase.execute(dto);

          // Decrypt and verify round-trip
          const decryptedDoc = encryptor.decrypt(captured.documentNumber);
          const decryptedPhone = encryptor.decrypt(captured.phoneNumber);

          return decryptedDoc === documentNumber && decryptedPhone === phoneNumber;
        },
      ),
      { numRuns: 100 },
    );
  });
});
