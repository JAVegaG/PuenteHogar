import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IESignatureProvider } from '@modules/contracts/domain/ports/e-signature-provider.port';
import { InitiateSigningDto } from '@modules/contracts/application/dtos/initiate-signing.dto';
import {
  CONTRACT_REPOSITORY,
  E_SIGNATURE_PROVIDER,
} from './upload-contract.use-case';

@Injectable()
export class InitiateSigningUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly repository: IContractRepository,
    @Inject(E_SIGNATURE_PROVIDER)
    private readonly eSignatureProvider: IESignatureProvider,
    private readonly circuitBreakerFactory: CircuitBreakerFactory,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(
    dto: InitiateSigningDto,
    userId: string,
  ): Promise<{ message: string; externalId?: string }> {
    const contract = await this.repository.findById(dto.contractId);
    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    const parties = await this.repository.findContractParties(dto.contractId);
    const isParty = parties.some((p) => p.userId === userId);
    if (!isParty) {
      throw new ForbiddenException('No tienes acceso a este contrato');
    }

    if (contract.status === 'SIGNED') {
      throw new BadRequestException('El contrato ya está firmado');
    }

    const breaker = this.circuitBreakerFactory.create('e-signature', 'signature');

    let externalId: string | undefined;

    await breaker.execute(
      async () => {
        const result = await this.eSignatureProvider.initiateSigningSession({
          contractId: contract.id,
          documentUrl: contract.fileUrl ?? '',
          parties: parties.map((p) => ({ userId: p.userId, role: p.roleInContract })),
        });

        externalId = result.externalId;

        await this.repository.updateStatus(dto.contractId, 'SIGNATURE_PENDING', {
          externalSigningId: result.externalId,
        });

        this.auditLogger.log({
          userId,
          action: 'SIGNING_INITIATED',
          resource: 'Contract',
          resourceId: dto.contractId,
          timestamp: new Date(),
          metadata: { externalId: result.externalId },
        });
      },
      () => {
        // Fallback when circuit is open
        this.repository
          .updateStatus(dto.contractId, 'SIGNATURE_PENDING')
          .catch(() => undefined);

        this.auditLogger.log({
          userId,
          action: 'SIGNING_FAILED',
          resource: 'Contract',
          resourceId: dto.contractId,
          timestamp: new Date(),
          metadata: { reason: 'circuit_open' },
        });
      },
    );

    return {
      message: externalId
        ? 'Proceso de firma iniciado'
        : 'Servicio de firma no disponible, reintente más tarde',
      externalId,
    };
  }
}
