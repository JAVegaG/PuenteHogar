import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { CreateLeaseDto } from '../dtos/create-lease.dto';
import { LeaseListItemDto } from '../dtos/lease-list-item.dto';

@Injectable()
export class CreateLeaseUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(
        portfolioId: string,
        unitId: string,
        dto: CreateLeaseDto,
        userId: string,
    ): Promise<LeaseListItemDto> {
        // 1. Verify portfolio ownership
        const portfolio = await this.prisma.landlordPortfolio.findUnique({
            where: { id: portfolioId },
        });
        if (!portfolio) {
            throw new NotFoundException('Portafolio no encontrado');
        }
        if (portfolio.user_id !== userId) {
            throw new ForbiddenException('No tienes permiso para crear arriendos en esta unidad');
        }

        // 2. Verify unit belongs to portfolio
        const unit = await this.prisma.portfolioUnit.findUnique({
            where: { id: unitId },
        });
        if (!unit || unit.portfolio_id !== portfolioId) {
            throw new NotFoundException('Unidad no encontrada');
        }

        // 3. Resolve tenant by email cross-schema
        const tenantUser = await this.prisma.user.findUnique({
            where: { mail: dto.tenantEmail },
        });
        if (!tenantUser) {
            throw new NotFoundException(
                'No se encontró un arrendatario con ese correo electrónico',
            );
        }

        // 4. Check no active lease exists for this unit
        const existingLeases = await this.prisma.lease.findMany({
            where: { portfolio_unit_id: unitId },
        });

        const now = new Date();
        for (const lease of existingLeases) {
            // Check if lease is still active (no end_date or future end_date)
            const isOpen = lease.end_date === null || lease.end_date > now;
            if (!isOpen) continue;

            // Check if lease status is "Vigente"
            const currentStatus = await this.prisma.leaseCurrentStatus.findUnique({
                where: { lease_id: lease.id },
                include: { status: true },
            });
            if (currentStatus?.status?.name === 'Vigente') {
                throw new ConflictException('Esta unidad ya tiene un arriendo activo');
            }
        }

        // 5. Create Lease record
        const newLease = await this.prisma.lease.create({
            data: {
                portfolio_unit_id: unitId,
                user_id: tenantUser.id,
                start_date: new Date(dto.startDate),
                end_date: dto.endDate ? new Date(dto.endDate) : null,
            },
        });

        // 6. Create LeaseStatusHistory with status "Acordado"
        const acordadoStatus = await this.prisma.leaseStatus.findUnique({
            where: { name: 'Acordado' },
        });

        let statusId = acordadoStatus?.id;
        if (!statusId) {
            // Create the status if it doesn't exist yet
            const created = await this.prisma.leaseStatus.create({
                data: { name: 'Acordado', description: 'Arriendo acordado entre las partes' },
            });
            statusId = created.id;
        }

        const historyEntry = await this.prisma.leaseStatusHistory.create({
            data: {
                lease_id: newLease.id,
                lease_status_id: statusId,
            },
        });

        // 7. Create LeaseCurrentStatus pointing to the history entry
        await this.prisma.leaseCurrentStatus.create({
            data: {
                lease_id: newLease.id,
                lease_status_history_id: historyEntry.id,
                lease_status_id: statusId,
            },
        });

        // 8. Build response
        const result = new LeaseListItemDto();
        result.id = newLease.id;
        result.startDate = newLease.start_date.toISOString();
        result.endDate = newLease.end_date ? newLease.end_date.toISOString() : null;
        result.monthlyAmount = Number(unit.lease_base_amount);
        result.status = 'Acordado';
        result.contractId = null;
        result.contractStatus = null;

        // Resolve tenant name
        result.tenantName = await this.resolveTenantName(tenantUser.id);

        return result;
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
}
