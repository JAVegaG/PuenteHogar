import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { S3ClientFactory } from '@src/shared/s3';
import { GetContractSummaryUseCase } from './application/use-cases/get-contract-summary.use-case';
import { GetLandlordContractsUseCase } from './application/use-cases/get-landlord-contracts.use-case';
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

@Module({
  imports: [ConfigModule],
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
    InitiateSigningUseCase,
    HandleSigningWebhookUseCase,
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
      useValue: {
        notifyContractSigned: async () => {
          // stub — notifications module will handle this
        },
        notifySigningFailed: async () => {
          // stub — notifications module will handle this
        },
      },
    },
  ],
  exports: [
    UploadContractUseCase,
    GetContractSummaryUseCase,
    InitiateSigningUseCase,
    HandleSigningWebhookUseCase,
  ],
})
export class ContractsModule { }
