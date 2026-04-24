import {
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import { CheckAndRevokeAutoAssignedRoleUseCase } from '@modules/users/application/use-cases/check-and-revoke-auto-assigned-role.use-case';
import { CONTRACT_REPOSITORY } from './upload-contract.use-case';

@Injectable()
export class DeleteContractUseCase {
    private readonly logger = new Logger(DeleteContractUseCase.name);

    constructor(
        @Inject(CONTRACT_REPOSITORY)
        private readonly repository: IContractRepository,
        private readonly auditLogger: AuditLoggerService,
        private readonly prisma: PrismaService,
        private readonly checkAndRevokeAutoAssignedRole: CheckAndRevokeAutoAssignedRoleUseCase,
    ) { }

    async execute(
        contractId: string,
        userId: string,
    ): Promise<{ message: string }> {

        const contract = await this.repository.findById(contractId);
        if (!contract) {
            throw new NotFoundException('Contrato no encontrado');
        }

        const parties = await this.repository.findContractParties(contractId);
        const isLandlord = parties.some(
            (p) => p.userId === userId && p.roleInContract === 'LANDLORD',
        );
        if (!isLandlord) {
            throw new ForbiddenException('No tienes permiso para realizar esta acción');
        }

        if (contract.status === 'SIGNED') {
            throw new ConflictException('No se puede eliminar un contrato firmado');
        }

        if (contract.status === 'SIGNATURE_PENDING') {
            const signings = await this.repository.findSigningsByContractId(contractId);
            const tenantParty = parties.find((p) => p.roleInContract === 'TENANT');
            const tenantHasSigned = signings.some(
                (s) =>
                    s.contractPartyId === tenantParty?.id &&
                    s.signingStatusName === 'COMPLETED',
            );
            if (tenantHasSigned) {
                throw new ConflictException(
                    'No se puede eliminar un contrato que ya fue firmado por ambas partes',
                );
            }
        }

        const wasPending = contract.status === 'PENDING';
        const leaseId = contract.leaseId;

        await this.repository.deleteContract(contractId);

        this.auditLogger.log({
            userId,
            action: 'CONTRACT_DELETED',
            resource: 'Contract',
            resourceId: contractId,
            timestamp: new Date(),
        });

        // Fire-and-forget: check if TENANT role should be auto-revoked
        if (wasPending) {
            try {
                const lease = await this.prisma.lease.findUnique({
                    where: { id: leaseId },
                    select: { user_id: true },
                });
                if (lease) {
                    await this.checkAndRevokeAutoAssignedRole.execute(lease.user_id, 'TENANT');
                }
            } catch (error) {
                this.logger.error(
                    `Failed to check auto-revocation for lease ${leaseId}: ${error instanceof Error ? error.message : error}`,
                );
            }
        }

        return { message: 'Contrato eliminado exitosamente' };
    }
}
