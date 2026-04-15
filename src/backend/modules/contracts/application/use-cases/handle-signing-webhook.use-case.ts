import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import { SigningWebhookDto } from '@modules/contracts/application/dtos/signing-webhook.dto';
import {
  CONTRACT_NOTIFICATION_PORT,
  CONTRACT_REPOSITORY,
} from './upload-contract.use-case';

@Injectable()
export class HandleSigningWebhookUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly repository: IContractRepository,
    @Inject(CONTRACT_NOTIFICATION_PORT)
    private readonly notificationPort: INotificationPort,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(dto: SigningWebhookDto): Promise<void> {
    const contract = await this.repository.findById(dto.contractId);
    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    if (dto.status === 'COMPLETED') {
      const signedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();

      await this.repository.updateStatus(contract.id, 'SIGNED', {
        signedAt,
        externalSigningId: dto.externalSigningId,
      });

      const parties = await this.repository.findContractParties(contract.id);
      const landlord = parties.find((p) => p.roleInContract === 'LANDLORD');
      const tenant = parties.find((p) => p.roleInContract === 'TENANT');

      if (landlord && tenant) {
        // fire-and-forget
        this.notificationPort
          .notifyContractSigned(landlord.userId, tenant.userId, contract.id, signedAt)
          .catch(() => undefined);
      }

      this.auditLogger.log({
        userId: 'system',
        action: 'CONTRACT_SIGNED',
        resource: 'Contract',
        resourceId: contract.id,
        timestamp: new Date(),
        metadata: { externalSigningId: dto.externalSigningId },
      });
    } else {
      // FAILED — keep SIGNATURE_PENDING for retry
      await this.repository.updateStatus(contract.id, 'SIGNATURE_PENDING');

      this.auditLogger.log({
        userId: 'system',
        action: 'SIGNING_WEBHOOK_FAILED',
        resource: 'Contract',
        resourceId: contract.id,
        timestamp: new Date(),
        metadata: { externalSigningId: dto.externalSigningId },
      });
    }
  }
}
