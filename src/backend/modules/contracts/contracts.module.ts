import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { S3ClientFactory } from '@src/shared/s3';
import { PII_ENCRYPTOR } from '@modules/users/application/use-cases/register-user.use-case';
import { AES256PIIEncryptor } from '@modules/users/infrastructure/adapters/aes256-pii-encryptor.adapter';
import { UsersModule } from '@modules/users/users.module';
import { NotificationsModule } from '@modules/notifications';
import { PaymentsModule } from '@modules/payments';
import { RentalTrackingModule } from '@modules/rental-tracking';
import { PaymentSchedulingAdapter } from '@modules/payments/infrastructure/adapters/payment-scheduling.adapter';
import { ContractNotificationAdapter } from './infrastructure/adapters/contract-notification.adapter';
import { ListingDeactivationAdapter } from './infrastructure/adapters/listing-deactivation.adapter';
import { GetContractSummaryUseCase } from './application/use-cases/get-contract-summary.use-case';
import { GetLandlordContractsUseCase } from './application/use-cases/get-landlord-contracts.use-case';
import { GetTenantContractsUseCase } from './application/use-cases/get-tenant-contracts.use-case';
import { HandleSigningWebhookUseCase } from './application/use-cases/handle-signing-webhook.use-case';
import { InitiateSigningUseCase } from './application/use-cases/initiate-signing.use-case';
import {
  CONTRACT_NOTIFICATION_PORT,
  CONTRACT_OBJECT_STORAGE,
  CONTRACT_REPOSITORY,
  E_SIGNATURE_PROVIDER,
  UploadContractUseCase,
} from './application/use-cases/upload-contract.use-case';
import { ReplaceContractFileUseCase } from './application/use-cases/replace-contract-file.use-case';
import { DeleteContractUseCase } from './application/use-cases/delete-contract.use-case';
import { ContractsController } from './contracts.controller';
import { ESignatureProviderAdapter } from './infrastructure/adapters/e-signature-provider.adapter';
import { ContractObjectStorageAdapter } from './infrastructure/adapters/object-storage.adapter';
import { ContractsEtlService } from './infrastructure/etl/contracts-etl.service';
import { PrismaContractRepository } from './infrastructure/repositories/prisma-contract.repository';
import { ContractsCrossModuleQueryService } from './infrastructure/repositories/contracts-cross-module-query.service';
import { CONTRACTS_CROSS_MODULE_QUERY } from './domain/ports/cross-module-query.port';
import { LISTING_DEACTIVATION_PORT } from './domain/ports/listing-deactivation.port';
import { PAYMENT_SCHEDULING_PORT } from './domain/ports/payment-scheduling.port';

@Module({
  imports: [ConfigModule, forwardRef(() => UsersModule), NotificationsModule, PaymentsModule, RentalTrackingModule],
  controllers: [ContractsController],
  providers: [
    PrismaService,
    AuditLoggerService,
    CircuitBreakerFactory,
    S3ClientFactory,
    ContractsEtlService,
    UploadContractUseCase,
    ReplaceContractFileUseCase,
    DeleteContractUseCase,
    GetContractSummaryUseCase,
    GetLandlordContractsUseCase,
    GetTenantContractsUseCase,
    InitiateSigningUseCase,
    HandleSigningWebhookUseCase,
    ContractsCrossModuleQueryService,
    {
      provide: CONTRACT_REPOSITORY,
      useClass: PrismaContractRepository,
    },
    {
      provide: E_SIGNATURE_PROVIDER,
      useClass: ESignatureProviderAdapter,
    },
    {
      provide: CONTRACT_OBJECT_STORAGE,
      useClass: ContractObjectStorageAdapter,
    },
    {
      provide: CONTRACT_NOTIFICATION_PORT,
      useClass: ContractNotificationAdapter,
    },
    {
      provide: PII_ENCRYPTOR,
      useClass: AES256PIIEncryptor,
    },
    {
      provide: CONTRACTS_CROSS_MODULE_QUERY,
      useExisting: ContractsCrossModuleQueryService,
    },
    {
      provide: PAYMENT_SCHEDULING_PORT,
      useExisting: PaymentSchedulingAdapter,
    },
    {
      provide: LISTING_DEACTIVATION_PORT,
      useClass: ListingDeactivationAdapter,
    },
  ],
  exports: [
    UploadContractUseCase,
    GetContractSummaryUseCase,
    InitiateSigningUseCase,
    HandleSigningWebhookUseCase,
    ContractsCrossModuleQueryService,
    CONTRACTS_CROSS_MODULE_QUERY,
  ],
})
export class ContractsModule { }
