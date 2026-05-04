import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { LeaseListItemDto } from '../dtos/lease-list-item.dto';

@Injectable()
export class GetUnitLeasesUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(
        portfolioId: string,
        unitId: string,
        userId: string,
    ): Promise<LeaseListItemDto[]> {
        // 1. Verify portfolio ownership
        const portfolio = await this.prisma.landlordPortfolio.findUnique({
            where: { id: portfolioId },
        });
        if (!portfolio) {
            throw new NotFoundException('Portafolio no encontrado');
        }
        if (portfolio.user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para ver los arriendos de esta unidad');
        }

        // 2. Verify unit belongs to portfolio
        const unit = await this.prisma.portfolioUnit.findUnique({
            where: { id: unitId },
        });
        if (!unit || unit.portfolio_id !== portfolioId) {
            throw new NotFoundException('Unidad no encontrada');
        }

        // 3. Query leases for the unit
        const leases = await this.prisma.lease.findMany({
            where: { portfolio_unit_id: unitId, deleted_at: null },
            orderBy: { start_date: 'desc' },
        });

        // 4. Resolve cross-schema data for each lease
        const results: LeaseListItemDto[] = [];

        for (const lease of leases) {
            const dto = new LeaseListItemDto();
            dto.id = lease.id;
            dto.startDate = lease.start_date.toISOString();
            dto.endDate = lease.end_date ? lease.end_date.toISOString() : null;
            dto.monthlyAmount = Number(unit.lease_base_amount);

            // Resolve tenant name cross-schema
            dto.tenantName = await this.resolveTenantName(lease.user_id);

            // Resolve lease status from tracking_process
            dto.status = await this.resolveLeaseStatus(lease.id);

            // Resolve contract info from contracts schema
            const contractInfo = await this.resolveContractInfo(lease.id);
            dto.contractId = contractInfo.contractId;
            dto.contractStatus = contractInfo.contractStatus;

            results.push(dto);
        }

        return results;
    }

    private async resolveTenantName(tenantUserId: string): Promise<string> {
        const natural = await this.prisma.naturalPersonDetail.findUnique({
            where: { user_id: tenantUserId },
        });
        if (natural) {
            return `${natural.first_name} ${natural.last_name}`;
        }

        const legal = await this.prisma.legalPersonDetail.findUnique({
            where: { user_id: tenantUserId },
        });
        if (legal) {
            return legal.business_name;
        }

        return 'Desconocido';
    }

    private async resolveLeaseStatus(leaseId: string): Promise<string> {
        const currentStatus = await this.prisma.leaseCurrentStatus.findUnique({
            where: { lease_id: leaseId },
            include: { status: true },
        });
        return currentStatus?.status?.name ?? 'Acordado';
    }

    private async resolveContractInfo(
        leaseId: string,
    ): Promise<{ contractId: string | null; contractStatus: string | null }> {
        const contract = await this.prisma.contract.findFirst({
            where: { lease_id: leaseId, deleted_at: null },
            include: { status: true },
            orderBy: { created_at: 'desc' },
        });
        if (!contract) {
            return { contractId: null, contractStatus: null };
        }
        return {
            contractId: contract.id,
            contractStatus: contract.status.name,
        };
    }
}
