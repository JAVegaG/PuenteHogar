import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteData } from '@src/shared/prisma/soft-delete.utils';

@Injectable()
export class CancelLeaseUseCase {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogger: AuditLoggerService,
    ) { }

    async execute(
        portfolioId: string,
        unitId: string,
        leaseId: string,
        userId: string,
    ): Promise<void> {
        // 1. Verify portfolio ownership
        const portfolio = await this.prisma.landlordPortfolio.findUnique({
            where: { id: portfolioId },
        });
        if (!portfolio) {
            throw new NotFoundException('Portafolio no encontrado');
        }
        if (portfolio.user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para cancelar este arriendo');
        }

        // 2. Verify unit belongs to portfolio
        const unit = await this.prisma.portfolioUnit.findUnique({
            where: { id: unitId },
        });
        if (!unit || unit.portfolio_id !== portfolioId) {
            throw new NotFoundException('Unidad no encontrada');
        }

        // 3. Find lease and verify it belongs to unit
        const lease = await this.prisma.lease.findUnique({
            where: { id: leaseId },
        });
        if (!lease || lease.portfolio_unit_id !== unitId) {
            throw new NotFoundException('Arriendo no encontrado');
        }

        // 4. Check lease status is "Acordado"
        const currentStatus = await this.prisma.leaseCurrentStatus.findUnique({
            where: { lease_id: leaseId },
            include: { status: true },
        });
        const leaseStatusName = currentStatus?.status?.name ?? 'Acordado';
        if (leaseStatusName !== 'Acordado') {
            throw new ConflictException('Solo se pueden cancelar arriendos en estado Acordado');
        }

        // 5. Check associated contract status
        const contract = await this.prisma.contract.findFirst({
            where: { lease_id: leaseId, deleted_at: null },
            include: { status: true },
            orderBy: { created_at: 'desc' },
        });

        if (contract) {
            const contractStatusName = contract.status.name;
            if (contractStatusName === 'SIGNED') {
                throw new ConflictException('No se puede cancelar un arriendo con contrato firmado');
            }
            // PENDING or SIGNATURE_PENDING → soft-delete contract in transaction
        }

        // 6. Execute all mutations in a transaction
        await this.prisma.$transaction(async (tx) => {
            // 6a. Soft-delete lease
            await tx.lease.update({
                where: { id: leaseId },
                data: softDeleteData(),
            });

            // 6b. Resolve "Finalizado" status
            let finalizadoStatus = await tx.leaseStatus.findUnique({
                where: { name: 'Finalizado' },
            });
            if (!finalizadoStatus) {
                finalizadoStatus = await tx.leaseStatus.create({
                    data: { name: 'Finalizado', description: 'Arriendo cancelado/finalizado' },
                });
            }

            // 6c. Create LeaseStatusHistory entry with "Finalizado"
            const historyEntry = await tx.leaseStatusHistory.create({
                data: {
                    lease_id: leaseId,
                    lease_status_id: finalizadoStatus.id,
                },
            });

            // 6d. Update LeaseCurrentStatus to "Finalizado"
            if (currentStatus) {
                await tx.leaseCurrentStatus.update({
                    where: { lease_id: leaseId },
                    data: {
                        lease_status_history_id: historyEntry.id,
                        lease_status_id: finalizadoStatus.id,
                    },
                });
            } else {
                await tx.leaseCurrentStatus.create({
                    data: {
                        lease_id: leaseId,
                        lease_status_history_id: historyEntry.id,
                        lease_status_id: finalizadoStatus.id,
                    },
                });
            }

            // 6e. Soft-delete contract if PENDING or SIGNATURE_PENDING
            if (contract) {
                await tx.contract.update({
                    where: { id: contract.id },
                    data: softDeleteData(),
                });
            }
        });

        // 7. Audit log
        this.auditLogger.log({
            userId,
            action: 'LEASE_CANCELLED',
            resource: 'Lease',
            resourceId: leaseId,
            timestamp: new Date(),
            metadata: {
                portfolioId,
                unitId,
                contractId: contract?.id ?? null,
            },
        });
    }
}
