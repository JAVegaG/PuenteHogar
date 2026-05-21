/**
 * Unit tests for PrismaService DATABASE_URL construction
 * Validates: Requirements 2.2, 3.1
 *
 * Tests the buildConnectionString logic:
 * - Constructs DATABASE_URL from individual env vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
 * - Falls back to existing DATABASE_URL if already set
 * - Properly URL-encodes special characters in the password
 */

// Top-level mocks for modules that PrismaService imports
jest.mock('@prisma-generated/client', () => ({
    PrismaClient: class MockPrismaClient {
        constructor(_opts?: any) { }
        $connect = jest.fn().mockResolvedValue(undefined);
        $disconnect = jest.fn().mockResolvedValue(undefined);
    },
}), { virtual: true });

jest.mock('@prisma/adapter-pg', () => ({
    PrismaPg: class MockPrismaPg {
        constructor(_opts?: any) { }
    },
}));

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

import { PrismaService } from './prisma.service';

describe('PrismaService — DATABASE_URL Construction', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        // Clear all DB-related env vars
        delete process.env.DATABASE_URL;
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;
        delete process.env.DB_NAME;
        delete process.env.DB_USER;
        delete process.env.DB_PASSWORD;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('constructs DATABASE_URL from individual env vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)', () => {
        process.env.DB_HOST = 'my-rds-instance.amazonaws.com';
        process.env.DB_PORT = '5432';
        process.env.DB_NAME = 'mydb';
        process.env.DB_USER = 'admin';
        process.env.DB_PASSWORD = 'secretpass';

        new PrismaService();

        expect(process.env.DATABASE_URL).toBe(
            'postgresql://admin:secretpass@my-rds-instance.amazonaws.com:5432/mydb',
        );
    });

    it('uses existing DATABASE_URL as-is when it is already set (fallback behavior)', () => {
        const existingUrl = 'postgresql://localuser:localpass@localhost:5432/localdb';
        process.env.DATABASE_URL = existingUrl;

        new PrismaService();

        // DATABASE_URL should remain unchanged
        expect(process.env.DATABASE_URL).toBe(existingUrl);
    });

    it('URL-encodes special characters in the password', () => {
        process.env.DB_HOST = 'db.example.com';
        process.env.DB_PORT = '5432';
        process.env.DB_NAME = 'testdb';
        process.env.DB_USER = 'dbuser';
        process.env.DB_PASSWORD = 'p@ss#w%rd!&=';

        new PrismaService();

        const expectedPassword = encodeURIComponent('p@ss#w%rd!&=');
        expect(process.env.DATABASE_URL).toBe(
            `postgresql://dbuser:${expectedPassword}@db.example.com:5432/testdb`,
        );
    });

    it('throws an error when DATABASE_URL is not set and required env vars are missing', () => {
        // Only set some vars, leave DB_PASSWORD missing
        process.env.DB_HOST = 'db.example.com';
        process.env.DB_PORT = '5432';
        process.env.DB_NAME = 'testdb';
        process.env.DB_USER = 'dbuser';
        // DB_PASSWORD is intentionally not set

        expect(() => new PrismaService()).toThrow(
            'DATABASE_URL is not set and one or more required DB env vars are missing',
        );
    });
});
