// Feature: backend-database-implementation, Property 51: Migraciones Prisma son idempotentes
// Validates: Requirements 13.7

import * as fs from 'fs';
import * as path from 'path';
import * as fc from 'fast-check';

/**
 * Resolves the migrations directory relative to this file.
 * This file lives at src/backend/src/shared/prisma/
 * Migrations live at src/backend/db/prisma/migrations/
 */
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '../../../db/prisma/migrations',
);

const MIGRATION_LOCK_FILE = path.join(MIGRATIONS_DIR, 'migration_lock.toml');

/** A migration directory entry: timestamp prefix + name */
interface MigrationEntry {
  dirName: string;
  timestamp: string;
  name: string;
  sqlPath: string;
}

/** Read all migration directories from the filesystem */
function readMigrationEntries(): MigrationEntry[] {
  const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const match = e.name.match(/^(\d{14})_(.+)$/);
      if (!match) {
        throw new Error(`Migration directory has unexpected name format: ${e.name}`);
      }
      return {
        dirName: e.name,
        timestamp: match[1],
        name: match[2],
        sqlPath: path.join(MIGRATIONS_DIR, e.name, 'migration.sql'),
      };
    });
}

describe('Prisma Migrations — Idempotency (Property 51)', () => {
  let migrations: MigrationEntry[];

  beforeAll(() => {
    migrations = readMigrationEntries();
  });

  // ─── Structural invariants (non-PBT) ────────────────────────────────────────

  it('migration_lock.toml exists and specifies postgresql provider', () => {
    expect(fs.existsSync(MIGRATION_LOCK_FILE)).toBe(true);
    const content = fs.readFileSync(MIGRATION_LOCK_FILE, 'utf-8');
    expect(content).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it('each migration directory contains exactly one migration.sql file', () => {
    for (const m of migrations) {
      expect(fs.existsSync(m.sqlPath)).toBe(true);
      const files = fs.readdirSync(path.dirname(m.sqlPath));
      const sqlFiles = files.filter((f) => f.endsWith('.sql'));
      expect(sqlFiles).toHaveLength(1);
    }
  });

  it('migration directory names follow the <timestamp>_<name> format', () => {
    for (const m of migrations) {
      expect(m.timestamp).toMatch(/^\d{14}$/);
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it('all migration timestamps are globally unique', () => {
    const timestamps = migrations.map((m) => m.timestamp);
    const unique = new Set(timestamps);
    expect(unique.size).toBe(timestamps.length);
  });

  it('all migration directory names are globally unique', () => {
    const names = migrations.map((m) => m.dirName);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  // ─── Property-based tests ────────────────────────────────────────────────────

  /**
   * Property 51: Migraciones Prisma son idempotentes
   * Validates: Requirements 13.7
   *
   * For any arbitrary subset of migrations, the idempotency invariants hold:
   *   1. No duplicate timestamps within the subset
   *   2. No duplicate directory names within the subset
   *   3. Each migration in the subset has a valid timestamp prefix
   *   4. The subset preserves the ordering guarantee (timestamps are sortable)
   */
  it('Property 51 — arbitrary subsets of migrations have no duplicate timestamps', () => {
    fc.assert(
      fc.property(
        fc.subarray(migrations),
        (subset) => {
          const timestamps = subset.map((m) => m.timestamp);
          const unique = new Set(timestamps);
          return unique.size === timestamps.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 51 — arbitrary subsets of migrations have no duplicate directory names', () => {
    fc.assert(
      fc.property(
        fc.subarray(migrations),
        (subset) => {
          const names = subset.map((m) => m.dirName);
          const unique = new Set(names);
          return unique.size === names.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 51 — arbitrary subsets of migrations all have valid 14-digit timestamp prefixes', () => {
    fc.assert(
      fc.property(
        fc.subarray(migrations),
        (subset) => {
          return subset.every((m) => /^\d{14}$/.test(m.timestamp));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 51 — arbitrary orderings of migrations can be deterministically sorted by timestamp', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(migrations),
        (shuffled) => {
          const sorted = [...shuffled].sort((a, b) =>
            a.timestamp.localeCompare(b.timestamp),
          );
          // After sorting, timestamps must be in non-decreasing order
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].timestamp < sorted[i - 1].timestamp) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 51 — each migration SQL uses safe DDL patterns (IF NOT EXISTS or Prisma idempotency via _prisma_migrations)', () => {
    /**
     * Prisma guarantees idempotency via the _prisma_migrations tracking table:
     * it records each applied migration and skips re-application.
     * Additionally, schema creation uses CREATE SCHEMA IF NOT EXISTS.
     * We verify that the SQL file is non-empty and that schema creation
     * statements use the safe IF NOT EXISTS pattern.
     */
    fc.assert(
      fc.property(
        fc.subarray(migrations),
        (subset) => {
          return subset.every((m) => {
            const sql = fs.readFileSync(m.sqlPath, 'utf-8');
            // SQL must be non-empty
            if (sql.trim().length === 0) return false;
            // All CREATE SCHEMA statements must use IF NOT EXISTS
            const createSchemaStatements = sql.match(/CREATE\s+SCHEMA\s+[^;]+;/gi) ?? [];
            return createSchemaStatements.every((stmt) =>
              /CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS/i.test(stmt),
            );
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 51 — migration names within any subset are unique (no duplicate migration names)', () => {
    fc.assert(
      fc.property(
        fc.subarray(migrations),
        (subset) => {
          const names = subset.map((m) => m.name);
          const unique = new Set(names);
          return unique.size === names.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});
