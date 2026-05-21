import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma-generated/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { execSync } from 'child_process';


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * SECURITY: Hardcoded migration command — no user input is interpolated.
   * This runs exclusively at application startup (onModuleInit) and is never
   * exposed to request handlers or external callers.
   */
  private static readonly MIGRATE_COMMAND =
    'npx prisma migrate deploy --schema=./db/prisma/schema.prisma';

  private static readonly MIGRATE_TIMEOUT_MS = 60_000;

  constructor() {
    const connectionString = PrismaService.buildConnectionString();
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });

    // Ensure DATABASE_URL is available for the Prisma CLI (used during startup migration)
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = connectionString;
    }
  }

  async onModuleInit() {
    this.runMigrations();
    await this.$connect();
  }

  /**
   * Runs Prisma migrations at startup. This method is private and only called
   * from onModuleInit — it cannot be triggered by HTTP requests or external input.
   */
  private runMigrations(): void {
    try {
      this.logger.log('Running Prisma migrations...');
      this.logger.log(`DATABASE_URL is ${process.env.DATABASE_URL ? 'set' : 'NOT set'} in process.env`);
      execSync(PrismaService.MIGRATE_COMMAND, {
        stdio: 'pipe',
        timeout: PrismaService.MIGRATE_TIMEOUT_MS,
      });
      this.logger.log('Prisma migrations applied successfully');
    } catch (error) {
      this.logger.error('Failed to run Prisma migrations', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Constructs the DATABASE_URL from individual environment variables.
   * Falls back to process.env.DATABASE_URL if it is already set (for local development).
   */
  private static buildConnectionString(): string {
    const logger = new Logger(PrismaService.name);

    if (process.env.DATABASE_URL) {
      logger.log('Using existing DATABASE_URL from environment');
      return process.env.DATABASE_URL;
    }

    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const dbName = process.env.DB_NAME;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;

    if (!host || !port || !dbName || !user || !password) {
      throw new Error(
        'DATABASE_URL is not set and one or more required DB env vars are missing ' +
        '(DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)',
      );
    }

    const encodedPassword = encodeURIComponent(password);
    const connectionString = `postgresql://${user}:${encodedPassword}@${host}:${port}/${dbName}?sslmode=no-verify`;

    logger.log(
      `Constructed DATABASE_URL from env vars: postgresql://${user}:****@${host}:${port}/${dbName}`,
    );

    return connectionString;
  }
}
