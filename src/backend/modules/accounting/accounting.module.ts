import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { RedisService } from '@src/shared/redis/redis.service';
import { AccountingController } from './accounting.controller';
import {
  ACCOUNTING_REPOSITORY,
  GetAggregatedReportUseCase,
  REPORT_CACHE,
} from './application/use-cases/get-aggregated-report.use-case';
import { GetIndividualReportUseCase } from './application/use-cases/get-individual-report.use-case';
import { RedisReportCache } from './infrastructure/cache/redis-report.cache';
import { AccountingEtlService } from './infrastructure/etl/accounting-etl.service';
import { PrismaAccountingRepository } from './infrastructure/repositories/prisma-accounting.repository';

@Module({
  imports: [ConfigModule],
  controllers: [AccountingController],
  providers: [
    PrismaService,
    RedisService,
    AccountingEtlService,
    GetAggregatedReportUseCase,
    GetIndividualReportUseCase,
    {
      provide: ACCOUNTING_REPOSITORY,
      useClass: PrismaAccountingRepository,
    },
    {
      provide: REPORT_CACHE,
      useClass: RedisReportCache,
    },
  ],
  exports: [GetAggregatedReportUseCase, GetIndividualReportUseCase],
})
export class AccountingModule {}
