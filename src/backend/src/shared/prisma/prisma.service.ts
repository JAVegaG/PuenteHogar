import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma-generated/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { execSync } from 'child_process';


@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = PrismaService.buildConnectionString();
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });

    // Ensure DATABASE_URL is available for the Prisma CLI (used by execSync migrate deploy)
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = connectionString;
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('Running Prisma migrations...');
      execSync('npx prisma migrate deploy --schema=./db/prisma/schema.prisma', {
        stdio: 'pipe',
      });
      this.logger.log('Prisma migrations applied successfully');
    } catch (error) {
      this.logger.error('Failed to run Prisma migrations', error);
      throw error;
    }

    await this.$connect();
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
    const connectionString = `postgresql://${user}:${encodedPassword}@${host}:${port}/${dbName}`;

    logger.log(
      `Constructed DATABASE_URL from env vars: postgresql://${user}:****@${host}:${port}/${dbName}`,
    );

    return connectionString;
  }
}
