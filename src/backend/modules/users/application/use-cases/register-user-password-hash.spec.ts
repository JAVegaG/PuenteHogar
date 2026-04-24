// Feature: backend-database-implementation, Property 6: Contraseñas almacenadas como hash bcrypt, nunca en texto plano
// Validates: Requirements 1.6

import * as fc from 'fast-check';
import { BcryptPasswordHasher } from '@modules/users/infrastructure/adapters/bcrypt-password-hasher.adapter';
import { RegisterUserUseCase } from './register-user.use-case';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import type { IPIIEncryptor } from '@modules/users/domain/ports/pii-encryptor.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import type { RegisterUserDto } from '@modules/users/application/dtos/register-user.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Bcrypt hash prefixes accepted as valid (cost factor encoded in prefix) */
const BCRYPT_PREFIX_REGEX = /^\$2[ab]\$(\d{2})\$/;
const MIN_COST_FACTOR = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the string looks like a valid bcrypt hash */
function isBcryptHash(value: string): boolean {
  return BCRYPT_PREFIX_REGEX.test(value);
}

/** Extracts the numeric cost factor from a bcrypt hash string */
function extractCostFactor(hash: string): number {
  const match = BCRYPT_PREFIX_REGEX.exec(hash);
  return match ? parseInt(match[1], 10) : 0;
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

function buildRepositoryMock(dto: RegisterUserDto, capturedHash: { value: string }): IUserRepository {
  return {
    findByMail: async () => null,
    findById: async () => null,
    findRoleByName: async (name: string) => ({ id: 'role-id-1', name }),
    findDocumentTypeByCode: async (code: string) => ({ id: 'doc-type-id-1', code }),
    findAllDocumentTypes: async () => [],
    findDisplayName: async () => null,
    create: async (data) => {
      capturedHash.value = data.hashedPassword;
      return new UserEntity(
        'user-id-1',
        dto.mail,
        data.hashedPassword,
        [dto.role],
        true,
        dto.userType,
        'doc-type-id-1',
        'encrypted-doc',
        'encrypted-phone',
      );
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
}

const piiEncryptor: IPIIEncryptor = {
  encrypt: () => 'encrypted-value',
  decrypt: () => 'decrypted-value',
};

const auditLogger = {
  log: () => undefined,
  logFailedLogin: () => undefined,
} as unknown as AuditLoggerService;

// ─── Arbitrary ────────────────────────────────────────────────────────────────

/** Arbitrary valid password: at least 8 characters (requirement 1.6) */
const arbitraryPassword = fc.string({ minLength: 8, maxLength: 64 }).filter(
  (s) => s.trim().length >= 8,
);

/** Minimal valid RegisterUserDto with a given password */
function buildDto(password: string): RegisterUserDto {
  return {
    mail: 'test@example.com',
    password,
    phoneNumber: '3001234567',
    documentTypeCode: 'CC',
    documentNumber: '123456789',
    userType: 'LANDLORD',
    role: 'LANDLORD',
    personType: 'natural',
    fullName: 'Test User',
    naturalDetails: { firstName: 'Test', lastName: 'User', preferredName: undefined },
    legalDetails: undefined,
  } as RegisterUserDto;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BcryptPasswordHasher — Property 6: Contraseñas almacenadas como hash bcrypt, nunca en texto plano', () => {
  const hasher = new BcryptPasswordHasher();

  /**
   * Property 6a — Validates: Requirements 1.6
   *
   * For any arbitrary valid password string, BcryptPasswordHasher.hash()
   * must return a valid bcrypt hash (starts with $2b$ or $2a$) and
   * must NOT equal the original plain-text password.
   *
   * Timeout: bcrypt cost-12 takes ~100ms per hash; 100 runs ≈ 10s.
   */
  it('hash() produce un hash bcrypt válido y nunca retorna la contraseña en texto plano', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPassword, async (password) => {
        const hash = await hasher.hash(password);

        // Must be a bcrypt hash
        if (!isBcryptHash(hash)) return false;

        // Must NOT be the plain-text password
        if (hash === password) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  }, 30_000);

  /**
   * Property 6b — Validates: Requirements 1.6
   *
   * The bcrypt cost factor used by BcryptPasswordHasher must be ≥ 12.
   * This is verified by inspecting the hash prefix ($2b$12$ or higher).
   *
   * Timeout: bcrypt cost-12 takes ~100ms per hash; 100 runs ≈ 10s.
   */
  it('hash() usa un factor de costo bcrypt ≥ 12', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPassword, async (password) => {
        const hash = await hasher.hash(password);
        const costFactor = extractCostFactor(hash);
        return costFactor >= MIN_COST_FACTOR;
      }),
      { numRuns: 100 },
    );
  }, 30_000);

  /**
   * Property 6c — Validates: Requirements 1.6
   *
   * Two calls to hash() with the same password must produce different hashes
   * (bcrypt uses a random salt per call), confirming that the stored value
   * is never a deterministic encoding of the plain-text password.
   *
   * Timeout: bcrypt cost-12 takes ~100ms per hash; 200 hashes ≈ 20s.
   */
  it('hash() produce hashes distintos para la misma contraseña (salt aleatorio)', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPassword, async (password) => {
        const hash1 = await hasher.hash(password);
        const hash2 = await hasher.hash(password);
        // Different hashes due to random salt
        return hash1 !== hash2;
      }),
      { numRuns: 100 },
    );
  }, 60_000);
});

describe('RegisterUserUseCase — Property 6: Contraseña almacenada como hash bcrypt en el repositorio', () => {
  const hasher = new BcryptPasswordHasher();

  /**
   * Property 6d — Validates: Requirements 1.6
   *
   * For any arbitrary valid password, when RegisterUserUseCase.execute() is called,
   * the value passed to IUserRepository.create() as `hashedPassword` must be a
   * valid bcrypt hash with cost factor ≥ 12, and must NOT equal the original
   * plain-text password.
   *
   * Timeout: bcrypt cost-12 takes ~100ms per hash; 100 runs ≈ 10s.
   */
  it('el campo hashedPassword enviado al repositorio es un hash bcrypt, nunca texto plano', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPassword, async (password) => {
        const dto = buildDto(password);
        const capturedHash = { value: '' };
        const repo = buildRepositoryMock(dto, capturedHash);

        const useCase = new RegisterUserUseCase(repo, hasher, piiEncryptor, auditLogger);
        await useCase.execute(dto);

        const stored = capturedHash.value;

        // Must be a bcrypt hash
        if (!isBcryptHash(stored)) return false;

        // Must NOT be the plain-text password
        if (stored === password) return false;

        // Cost factor must be ≥ 12
        if (extractCostFactor(stored) < MIN_COST_FACTOR) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  }, 30_000);
});
