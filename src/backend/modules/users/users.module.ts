import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { PORTFOLIO_CROSS_MODULE_QUERY } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { PortfolioCrossModuleQueryService } from '@modules/landlord-portfolio/infrastructure/repositories/portfolio-cross-module-query.service';
import { LandlordPortfolioModule } from '@modules/landlord-portfolio/landlord-portfolio.module';
import { CONTRACTS_CROSS_MODULE_QUERY } from '@modules/contracts/domain/ports/cross-module-query.port';
import { ContractsCrossModuleQueryService } from '@modules/contracts/infrastructure/repositories/contracts-cross-module-query.service';
import { ContractsModule } from '@modules/contracts/contracts.module';
import { PAYMENTS_CROSS_MODULE_QUERY } from '@modules/payments/domain/ports/cross-module-query.port';
import { PaymentsCrossModuleQueryService } from '@modules/payments/infrastructure/repositories/payments-cross-module-query.service';
import { PaymentsModule } from '@modules/payments/payments.module';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import {
  PASSWORD_HASHER,
  PII_ENCRYPTOR,
  RegisterUserUseCase,
  USER_REPOSITORY,
} from './application/use-cases/register-user.use-case';
import { AddRoleUseCase } from './application/use-cases/add-role.use-case';
import { RemoveRoleUseCase } from './application/use-cases/remove-role.use-case';
import { GetRemovableRolesUseCase } from './application/use-cases/get-removable-roles.use-case';
import { CheckAndRevokeAutoAssignedRoleUseCase } from './application/use-cases/check-and-revoke-auto-assigned-role.use-case';
import { AES256PIIEncryptor } from './infrastructure/adapters/aes256-pii-encryptor.adapter';
import { BcryptPasswordHasher } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { JwtStrategy } from './infrastructure/adapters/jwt-strategy';
import { UsersEtlService } from './infrastructure/etl/users-etl.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { UsersController } from './users.controller';
import ms from 'ms'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<ms.StringValue>('jwt.expiresIn') },
      }),
    }),
    LandlordPortfolioModule,
    forwardRef(() => ContractsModule),
    PaymentsModule,
  ],
  controllers: [UsersController],
  providers: [
    PrismaService,
    RegisterUserUseCase,
    LoginUseCase,
    GetUserProfileUseCase,
    AddRoleUseCase,
    RemoveRoleUseCase,
    GetRemovableRolesUseCase,
    CheckAndRevokeAutoAssignedRoleUseCase,
    AuditLoggerService,
    JwtStrategy,
    UsersEtlService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: PII_ENCRYPTOR,
      useClass: AES256PIIEncryptor,
    },
    {
      provide: PORTFOLIO_CROSS_MODULE_QUERY,
      useExisting: PortfolioCrossModuleQueryService,
    },
    {
      provide: CONTRACTS_CROSS_MODULE_QUERY,
      useExisting: ContractsCrossModuleQueryService,
    },
    {
      provide: PAYMENTS_CROSS_MODULE_QUERY,
      useExisting: PaymentsCrossModuleQueryService,
    },
  ],
  exports: [JwtModule, CheckAndRevokeAutoAssignedRoleUseCase],
})
export class UsersModule { }
