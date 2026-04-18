import { Module } from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { CreatePortfolioUnitUseCase, PORTFOLIO_REPOSITORY } from './application/use-cases/create-portfolio-unit.use-case';
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case';
import { UpdatePortfolioUnitUseCase } from './application/use-cases/update-portfolio-unit.use-case';
import { ListPortfoliosUseCase } from './application/use-cases/list-portfolios.use-case';
import { CreatePortfolioUseCase } from './application/use-cases/create-portfolio.use-case';
import { CreateEnrichedUnitUseCase } from './application/use-cases/create-enriched-unit.use-case';
import { LandlordPortfolioEtlService } from './infrastructure/etl/landlord-portfolio-etl.service';
import { PrismaPortfolioRepository } from './infrastructure/repositories/prisma-portfolio.repository';
import { LandlordPortfolioController } from './landlord-portfolio.controller';

@Module({
  controllers: [LandlordPortfolioController],
  providers: [
    PrismaService,
    AuditLoggerService,
    LandlordPortfolioEtlService,
    CreatePortfolioUnitUseCase,
    GetPortfolioUseCase,
    UpdatePortfolioUnitUseCase,
    ListPortfoliosUseCase,
    CreatePortfolioUseCase,
    CreateEnrichedUnitUseCase,
    {
      provide: PORTFOLIO_REPOSITORY,
      useClass: PrismaPortfolioRepository,
    },
  ],
  exports: [CreatePortfolioUnitUseCase, GetPortfolioUseCase, UpdatePortfolioUnitUseCase, ListPortfoliosUseCase, CreatePortfolioUseCase, CreateEnrichedUnitUseCase],
})
export class LandlordPortfolioModule {}
