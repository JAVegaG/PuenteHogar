import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { PII_ENCRYPTOR } from '@modules/users/application/use-cases/register-user.use-case';
import { AES256PIIEncryptor } from '@modules/users/infrastructure/adapters/aes256-pii-encryptor.adapter';
import { CreatePortfolioUnitUseCase, PORTFOLIO_REPOSITORY } from './application/use-cases/create-portfolio-unit.use-case';
import { GetPortfolioUseCase } from './application/use-cases/get-portfolio.use-case';
import { UpdatePortfolioUnitUseCase } from './application/use-cases/update-portfolio-unit.use-case';
import { ListPortfoliosUseCase } from './application/use-cases/list-portfolios.use-case';
import { CreatePortfolioUseCase } from './application/use-cases/create-portfolio.use-case';
import { CreateEnrichedUnitUseCase } from './application/use-cases/create-enriched-unit.use-case';
import { GetUnitLeasesUseCase } from './application/use-cases/get-unit-leases.use-case';
import { GetLeaseDetailUseCase } from './application/use-cases/get-lease-detail.use-case';
import { CreateLeaseUseCase } from './application/use-cases/create-lease.use-case';
import { CancelLeaseUseCase } from './application/use-cases/cancel-lease.use-case';
import { DeletePortfolioUseCase } from './application/use-cases/delete-portfolio.use-case';
import { DeleteUnitUseCase } from './application/use-cases/delete-unit.use-case';
import { UpdatePortfolioUseCase } from './application/use-cases/update-portfolio.use-case';
import { LandlordPortfolioEtlService } from './infrastructure/etl/landlord-portfolio-etl.service';
import { PrismaPortfolioRepository } from './infrastructure/repositories/prisma-portfolio.repository';
import { PortfolioCrossModuleQueryService } from './infrastructure/repositories/portfolio-cross-module-query.service';
import { PORTFOLIO_CROSS_MODULE_QUERY } from './domain/ports/cross-module-query.port';
import { LandlordPortfolioController } from './landlord-portfolio.controller';

@Module({
  imports: [ConfigModule],
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
    GetUnitLeasesUseCase,
    GetLeaseDetailUseCase,
    CreateLeaseUseCase,
    CancelLeaseUseCase,
    UpdatePortfolioUseCase,
    DeletePortfolioUseCase,
    DeleteUnitUseCase,
    PortfolioCrossModuleQueryService,
    {
      provide: PORTFOLIO_REPOSITORY,
      useClass: PrismaPortfolioRepository,
    },
    {
      provide: PORTFOLIO_CROSS_MODULE_QUERY,
      useExisting: PortfolioCrossModuleQueryService,
    },
    {
      provide: PII_ENCRYPTOR,
      useClass: AES256PIIEncryptor,
    },
  ],
  exports: [CreatePortfolioUnitUseCase, GetPortfolioUseCase, UpdatePortfolioUnitUseCase, ListPortfoliosUseCase, CreatePortfolioUseCase, CreateEnrichedUnitUseCase, GetUnitLeasesUseCase, GetLeaseDetailUseCase, CreateLeaseUseCase, CancelLeaseUseCase, UpdatePortfolioUseCase, DeletePortfolioUseCase, DeleteUnitUseCase, PortfolioCrossModuleQueryService, PORTFOLIO_CROSS_MODULE_QUERY],
})
export class LandlordPortfolioModule { }
