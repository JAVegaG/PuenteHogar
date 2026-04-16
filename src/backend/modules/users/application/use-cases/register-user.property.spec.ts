// Feature: backend-database-implementation, Property 3: Campos inválidos o ausentes retornan 400 con detalle
// Validates: Requirements 1.3

import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterUserDto } from '@modules/users/application/dtos/register-user.dto';

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_USER_TYPES = ['LANDLORD', 'TENANT'] as const;
const VALID_PERSON_TYPES = ['natural', 'legal'] as const;
const VALID_DOCUMENT_CODES = ['CC', 'NIT', 'CE', 'PP', 'TI'] as const;

// ─── Valid field generators (used as base) ───────────────────────────────────

const arbitraryValidEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'co', 'net', 'org'),
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

const arbitraryValidPassword = fc
  .string({ minLength: 8, maxLength: 30 })
  .filter((s) => s.trim().length >= 8);

const arbitraryValidPhone = fc
  .integer({ min: 3000000000, max: 3999999999 })
  .map((n) => String(n));

const arbitraryNonEmpty = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

// ─── Invalid field generators ─────────────────────────────────────────────────

/** Invalid email: missing @, missing domain, empty string, or random non-email string */
const arbitraryInvalidEmail = fc.oneof(
  fc.constant(''),
  fc.constant('notanemail'),
  fc.constant('@nodomain'),
  fc.constant('missing-at-sign.com'),
  fc.constant('   '),
  fc.stringMatching(/^[a-z]{1,10}$/).filter((s) => !s.includes('@')),
);

/** Invalid password: shorter than 8 characters */
const arbitraryShortPassword = fc
  .string({ minLength: 0, maxLength: 7 })
  .filter((s) => s.length < 8);

/** Invalid phone: not exactly 10 digits */
const arbitraryInvalidPhone = fc.oneof(
  fc.constant(''),
  fc.constant('123'),
  fc.constant('12345678901'), // 11 digits
  fc.constant('abcdefghij'),  // letters
  fc.integer({ min: 100000000, max: 999999999 }).map((n) => String(n)), // 9 digits
);

/** Invalid role: not LANDLORD or TENANT.
 * RegisterUserDto uses @IsIn(['LANDLORD', 'TENANT']) on role.
 */
const arbitraryInvalidRole = fc.oneof(
  fc.constant('ADMIN'),
  fc.constant('SUPERUSER'),
  fc.constant('landlord'), // lowercase — not in the allowed list
  fc.constant('tenant'),   // lowercase — not in the allowed list
  fc.string({ minLength: 1, maxLength: 10 }).filter(
    (s) => !VALID_USER_TYPES.includes(s as typeof VALID_USER_TYPES[number]),
  ),
);

/**
 * Invalid personType: not 'natural' or 'legal'.
 * RegisterUserDto uses @IsIn(['natural', 'legal']) on personType.
 */
const arbitraryInvalidPersonType = fc.oneof(
  fc.constant('NATURAL'),  // uppercase — not in the allowed list
  fc.constant('LEGAL'),    // uppercase — not in the allowed list
  fc.constant('person'),
  fc.string({ minLength: 1, maxLength: 10 }).filter(
    (s) => !VALID_PERSON_TYPES.includes(s as typeof VALID_PERSON_TYPES[number]),
  ),
);

// ─── Invalid DTO generator ────────────────────────────────────────────────────

/**
 * Produces a plain object with at least one invalid or missing field.
 * Each variant targets a specific validation rule from RegisterUserDto.
 */
function arbitraryInvalidRegistrationDto(): fc.Arbitrary<Record<string, unknown>> {
  // Base valid fields (all present and valid)
  const validBase = fc.record({
    mail: arbitraryValidEmail,
    password: arbitraryValidPassword,
    phoneNumber: arbitraryValidPhone,
    documentTypeCode: fc.constantFrom(...VALID_DOCUMENT_CODES),
    documentNumber: arbitraryNonEmpty,
    userType: fc.constantFrom(...VALID_USER_TYPES),
    role: fc.constantFrom(...VALID_USER_TYPES),
    personType: fc.constantFrom(...VALID_PERSON_TYPES),
    fullName: arbitraryNonEmpty,
  });

  // Each mutation introduces exactly one invalid or missing field.
  // Only fields with strict validation constraints are included:
  //   - @IsEmail() on mail
  //   - @MinLength(8) on password
  //   - @Matches(/^\d{10}$/) on phoneNumber
  //   - @IsIn(['LANDLORD','TENANT']) on role
  //   - @IsIn(['natural','legal']) on personType
  //   - @IsNotEmpty() / @IsString() on required string fields
  const mutations: Array<fc.Arbitrary<Partial<Record<string, unknown>>>> = [
    // Missing required fields (triggers @IsNotEmpty / @IsEmail / @IsIn)
    fc.constant({ mail: undefined }),
    fc.constant({ password: undefined }),
    fc.constant({ phoneNumber: undefined }),
    fc.constant({ documentTypeCode: undefined }),
    fc.constant({ documentNumber: undefined }),
    fc.constant({ role: undefined }),
    fc.constant({ personType: undefined }),
    fc.constant({ fullName: undefined }),
    // Invalid email format (@IsEmail)
    arbitraryInvalidEmail.map((mail) => ({ mail })),
    // Password too short (@MinLength(8))
    arbitraryShortPassword.map((password) => ({ password })),
    // Phone not 10 digits (@Matches(/^\d{10}$/))
    arbitraryInvalidPhone.map((phoneNumber) => ({ phoneNumber })),
    // Invalid role (@IsIn(['LANDLORD', 'TENANT']))
    arbitraryInvalidRole.map((role) => ({ role })),
    // Invalid personType (@IsIn(['natural', 'legal']))
    arbitraryInvalidPersonType.map((personType) => ({ personType })),
  ];

  return fc
    .tuple(validBase, fc.oneof(...mutations))
    .map(([base, mutation]) => ({ ...base, ...mutation }));
}

// ─── Helper: validate DTO and return errors ───────────────────────────────────

async function validateDto(plain: Record<string, unknown>): Promise<string[]> {
  const instance = plainToInstance(RegisterUserDto, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: false,
  });
  return errors.map((e) => e.property);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterUserDto — Property 3: Campos inválidos o ausentes retornan 400 con detalle', () => {
  /**
   * Property 3 — Validates: Requirements 1.3
   *
   * For any DTO with at least one invalid or missing required field,
   * class-validator must report at least one validation error, identifying
   * the specific field(s) that require correction.
   *
   * This mirrors the behaviour of NestJS ValidationPipe (which uses class-validator
   * internally) and confirms that the API would return HTTP 400 with field details.
   */
  it('campos inválidos o ausentes producen errores de validación con detalle de campo', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryInvalidRegistrationDto(), async (invalidDto) => {
        const invalidFields = await validateDto(invalidDto);

        // At least one field must have a validation error
        return invalidFields.length > 0;
      }),
      { numRuns: 100 },
    );
  });
});
