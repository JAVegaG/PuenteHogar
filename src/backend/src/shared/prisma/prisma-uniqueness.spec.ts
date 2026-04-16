// Feature: backend-database-implementation, Property 50: Restricciones de unicidad en BD previenen duplicados
// Validates: Requirements 13.4

import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

/**
 * Resolves the Prisma schema file relative to this file.
 * This file lives at src/backend/src/shared/prisma/
 * Schema lives at src/backend/db/prisma/schema.prisma
 */
const SCHEMA_PATH = path.resolve(
  __dirname,
  '../../../db/prisma/schema.prisma',
);

/** Represents a parsed model block from the Prisma schema */
interface PrismaModel {
  name: string;
  body: string;
}

/** Parse all model blocks from the Prisma schema file */
function parsePrismaModels(schemaContent: string): PrismaModel[] {
  const models: PrismaModel[] = [];
  // Match model blocks: model <Name> { ... }
  const modelRegex = /^model\s+(\w+)\s*\{([^}]*)\}/gm;
  let match: RegExpExecArray | null;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push({ name: match[1], body: match[2] });
  }
  return models;
}

/** Check if a model body contains a @unique field annotation for a given field name */
function hasFieldUnique(modelBody: string, fieldName: string): boolean {
  // Match lines like:  mail  String  @unique
  const lines = modelBody.split('\n');
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith(fieldName) &&
      trimmed.includes('@unique')
    );
  });
}

/** Check if a model body contains a @@unique block-level constraint */
function hasBlockUnique(modelBody: string, fields: string[]): boolean {
  // Match @@unique([field1, field2]) — order-insensitive
  const blockUniqueRegex = /@@unique\(\[([^\]]+)\]\)/g;
  let match: RegExpExecArray | null;
  while ((match = blockUniqueRegex.exec(modelBody)) !== null) {
    const definedFields = match[1]
      .split(',')
      .map((f) => f.trim());
    const allPresent = fields.every((f) => definedFields.includes(f));
    if (allPresent) return true;
  }
  return false;
}

/** Check if a model body contains a @@id block-level constraint (composite PK acts as unique) */
function hasCompositeId(modelBody: string, fields: string[]): boolean {
  const blockIdRegex = /@@id\(\[([^\]]+)\]\)/g;
  let match: RegExpExecArray | null;
  while ((match = blockIdRegex.exec(modelBody)) !== null) {
    const definedFields = match[1]
      .split(',')
      .map((f) => f.trim());
    const allPresent = fields.every((f) => definedFields.includes(f));
    if (allPresent) return true;
  }
  return false;
}

describe('Prisma Schema — Uniqueness Constraints (Property 50)', () => {
  let schemaContent: string;
  let models: PrismaModel[];

  beforeAll(() => {
    schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    models = parsePrismaModels(schemaContent);
  });

  // ─── Structural invariants (non-PBT) ────────────────────────────────────────

  it('schema.prisma file exists and is non-empty', () => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    expect(schemaContent.trim().length).toBeGreaterThan(0);
  });

  it('schema contains the User model', () => {
    const userModel = models.find((m) => m.name === 'User');
    expect(userModel).toBeDefined();
  });

  it('User.mail has @unique constraint (prevents duplicate emails)', () => {
    const userModel = models.find((m) => m.name === 'User');
    expect(userModel).toBeDefined();
    expect(hasFieldUnique(userModel!.body, 'mail')).toBe(true);
  });

  it('UserRole has a uniqueness constraint on user_id + role_id combination', () => {
    const userRoleModel = models.find((m) => m.name === 'UserRole');
    expect(userRoleModel).toBeDefined();
    // Either @@unique([user_id, role_id]) or @@id([user_id, role_id]) enforces uniqueness
    const hasUnique = hasBlockUnique(userRoleModel!.body, ['user_id', 'role_id']);
    const hasComposite = hasCompositeId(userRoleModel!.body, ['user_id', 'role_id']);
    expect(hasUnique || hasComposite).toBe(true);
  });

  it('Listing has a uniqueness constraint on portfolio_unit_id + is_active combination', () => {
    const listingModel = models.find((m) => m.name === 'Listing');
    expect(listingModel).toBeDefined();
    const hasUnique = hasBlockUnique(listingModel!.body, ['portfolio_unit_id', 'is_active']);
    expect(hasUnique).toBe(true);
  });

  it('Lease has a uniqueness constraint on portfolio_unit_id + active state', () => {
    const leaseModel = models.find((m) => m.name === 'Lease');
    expect(leaseModel).toBeDefined();
    // Active lease per portfolio unit: @@unique([portfolio_unit_id, end_date]) or similar
    // The constraint prevents two active leases for the same unit
    const hasUnique =
      hasBlockUnique(leaseModel!.body, ['portfolio_unit_id', 'end_date']) ||
      hasBlockUnique(leaseModel!.body, ['portfolio_unit_id', 'is_active']);
    expect(hasUnique).toBe(true);
  });

  // ─── Property-based tests ────────────────────────────────────────────────────

  /**
   * Property 50: Restricciones de unicidad en BD previenen duplicados
   * Validates: Requirements 13.4
   *
   * For any arbitrary subset of models from the schema, the uniqueness invariants hold:
   *   1. Models with @unique fields have exactly one @unique annotation per field
   *   2. @@unique block constraints reference only fields that exist in the model
   *   3. @@id composite constraints reference only fields that exist in the model
   *   4. No model has both @unique on a field AND @@unique on the same field (redundancy)
   */
  it('Property 50 — @unique field annotations are not duplicated within any model', () => {
    fc.assert(
      fc.property(
        fc.subarray(models),
        (subset) => {
          return subset.every((model) => {
            const lines = model.body.split('\n');
            const uniqueFields: string[] = [];
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.includes('@unique') && !trimmed.startsWith('@@')) {
                // Extract field name (first token)
                const fieldName = trimmed.split(/\s+/)[0];
                if (uniqueFields.includes(fieldName)) {
                  // Duplicate @unique on same field — invalid
                  return false;
                }
                uniqueFields.push(fieldName);
              }
            }
            return true;
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 50 — @@unique block constraints reference at least 2 fields', () => {
    fc.assert(
      fc.property(
        fc.subarray(models),
        (subset) => {
          return subset.every((model) => {
            const blockUniqueRegex = /@@unique\(\[([^\]]+)\]\)/g;
            let match: RegExpExecArray | null;
            while ((match = blockUniqueRegex.exec(model.body)) !== null) {
              const fields = match[1].split(',').map((f) => f.trim()).filter(Boolean);
              // A @@unique with fewer than 2 fields should use @unique on the field instead
              if (fields.length < 2) return false;
            }
            return true;
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 50 — @@id composite constraints reference at least 2 fields', () => {
    fc.assert(
      fc.property(
        fc.subarray(models),
        (subset) => {
          return subset.every((model) => {
            const blockIdRegex = /@@id\(\[([^\]]+)\]\)/g;
            let match: RegExpExecArray | null;
            while ((match = blockIdRegex.exec(model.body)) !== null) {
              const fields = match[1].split(',').map((f) => f.trim()).filter(Boolean);
              // A composite @@id must reference at least 2 fields
              if (fields.length < 2) return false;
            }
            return true;
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 50 — models with @unique fields do not also declare @@unique on the same field', () => {
    fc.assert(
      fc.property(
        fc.subarray(models),
        (subset) => {
          return subset.every((model) => {
            // Collect fields with inline @unique
            const inlineUniqueFields: string[] = [];
            const lines = model.body.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.includes('@unique') && !trimmed.startsWith('@@')) {
                const fieldName = trimmed.split(/\s+/)[0];
                inlineUniqueFields.push(fieldName);
              }
            }

            // Check that no @@unique block references a single inline-unique field alone
            const blockUniqueRegex = /@@unique\(\[([^\]]+)\]\)/g;
            let match: RegExpExecArray | null;
            while ((match = blockUniqueRegex.exec(model.body)) !== null) {
              const blockFields = match[1].split(',').map((f) => f.trim()).filter(Boolean);
              if (
                blockFields.length === 1 &&
                inlineUniqueFields.includes(blockFields[0])
              ) {
                // Redundant: field already has @unique and is also in a single-field @@unique
                return false;
              }
            }
            return true;
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 50 — every model that has a @unique field annotation has a non-empty field name', () => {
    fc.assert(
      fc.property(
        fc.subarray(models),
        (subset) => {
          return subset.every((model) => {
            const lines = model.body.split('\n');
            return lines.every((line) => {
              const trimmed = line.trim();
              if (trimmed.includes('@unique') && !trimmed.startsWith('@@')) {
                const fieldName = trimmed.split(/\s+/)[0];
                return fieldName.length > 0;
              }
              return true;
            });
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
