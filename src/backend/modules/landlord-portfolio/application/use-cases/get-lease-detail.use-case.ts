import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { LeaseDetailDto, LeaseDetailTenantDto, LeaseDetailPropertyDto } from '../dtos/lease-detail.dto';

@Injectable()
export class GetLeaseDetailUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(
        portfolioId: string,
        unitId: string,
        leaseId: string,
        userId: string,
    ): Promise<LeaseDetailDto> {
        // 1. Verify portfolio ownership
        const portfolio = await this.prisma.landlordPortfolio.findUnique({
            where: { id: portfolioId },
        });
        if (!portfolio) {
            throw new NotFoundException('Portafolio no encontrado');
        }
        if (portfolio.user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para ver este arriendo');
        }

        // 2. Verify unit belongs to portfolio
        const unit = await this.prisma.portfolioUnit.findUnique({
            where: { id: unitId },
        });
        if (!unit || unit.portfolio_id !== portfolioId) {
            throw new NotFoundException('Unidad no encontrada');
        }

        // 3. Find the lease
        const lease = await this.prisma.lease.findUnique({
            where: { id: leaseId },
        });
        if (!lease || lease.portfolio_unit_id !== unitId) {
            throw new NotFoundException('Arriendo no encontrado');
        }

        // 4. Resolve tenant info cross-schema
        const tenant = await this.resolveTenantInfo(lease.user_id);

        // 5. Resolve property info cross-schema
        const property = await this.resolvePropertyInfo(unit.property_id);

        // 6. Resolve lease status
        const status = await this.resolveLeaseStatus(lease.id);

        // 7. Resolve contract info
        const contractInfo = await this.resolveContractInfo(lease.id);

        // 8. Build response
        const dto = new LeaseDetailDto();
        dto.id = lease.id;
        dto.portfolioUnitId = lease.portfolio_unit_id;
        dto.userId = lease.user_id;
        dto.startDate = lease.start_date.toISOString();
        dto.endDate = lease.end_date ? lease.end_date.toISOString() : null;
        dto.status = status;
        dto.monthlyAmount = Number(unit.lease_base_amount);
        dto.contractId = contractInfo.contractId;
        dto.contractStatus = contractInfo.contractStatus;
        dto.tenant = tenant;
        dto.property = property;

        return dto;
    }

    private async resolveTenantInfo(tenantUserId: string): Promise<LeaseDetailTenantDto> {
        const user = await this.prisma.user.findUnique({
            where: { id: tenantUserId },
            include: { document_type: true },
        });

        const tenant = new LeaseDetailTenantDto();

        const natural = await this.prisma.naturalPersonDetail.findUnique({
            where: { user_id: tenantUserId },
        });
        if (natural) {
            tenant.fullName = `${natural.first_name} ${natural.last_name}`;
        } else {
            const legal = await this.prisma.legalPersonDetail.findUnique({
                where: { user_id: tenantUserId },
            });
            tenant.fullName = legal?.business_name ?? 'Desconocido';
        }

        tenant.documentTypeCode = user?.document_type?.code ?? '';
        tenant.documentNumber = user?.document_number ?? '';
        tenant.email = user?.mail ?? '';
        tenant.phoneNumber = user?.phone_number ?? '';

        return tenant;
    }

    private async resolvePropertyInfo(propertyId: string): Promise<LeaseDetailPropertyDto> {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: { address: true },
        });

        const dto = new LeaseDetailPropertyDto();
        dto.propertyType = property?.property_type ?? '';
        dto.numberOfRooms = property?.number_of_rooms ?? 0;
        dto.numberOfBathrooms = property?.number_of_bathrooms ?? 0;
        dto.area = property?.length && property?.width
            ? Number(property.length) * Number(property.width)
            : null;
        dto.address = property?.address?.address ?? '';

        return dto;
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
            where: { lease_id: leaseId },
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
