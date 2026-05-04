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
import { CreateLeaseDto } from '../dtos/create-lease.dto';
import { LeaseListItemDto } from '../dtos/lease-list-item.dto';
import { PORTFOLIO_NOTIFICATION_PORT } from '../../domain/ports/notification.port';
import type { IPortfolioNotificationPort } from '../../domain/ports/notification.port';

@Injectable()
export class CreateLeaseUseCase {
    private readonly logger = new Logger(CreateLeaseUseCase.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogger: AuditLoggerService,
        @Inject(PORTFOLIO_NOTIFICATION_PORT)
        private readonly notificationPort: IPortfolioNotificationPort,
    ) { }

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

        // 4. Auto-assign TENANT role if tenant doesn't have it
        await this.autoAssignTenantRole(tenantUser.id);

        // 5. Check no active lease exists for this unit
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

        // 6. Create Lease record
        const newLease = await this.prisma.lease.create({
            data: {
                portfolio_unit_id: unitId,
                user_id: tenantUser.id,
                start_date: new Date(dto.startDate),
                end_date: dto.endDate ? new Date(dto.endDate) : null,
            },
        });

        // 7. Create LeaseStatusHistory with status "Acordado"
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

        // 8. Create LeaseCurrentStatus pointing to the history entry
        await this.prisma.leaseCurrentStatus.create({
            data: {
                lease_id: newLease.id,
                lease_status_history_id: historyEntry.id,
                lease_status_id: statusId,
            },
        });

        // 9. Build response
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

        // Fire-and-forget notification
        this.notificationPort.notifyLeaseCreated(tenantUser.id, newLease.id, unitId).catch(() => undefined);

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

    private async autoAssignTenantRole(tenantUserId: string): Promise<void> {
        try {
            const tenantRole = await this.prisma.role.findUnique({
                where: { name: 'TENANT' },
            });
            if (!tenantRole) {
                this.logger.warn('TENANT role not found in database, skipping auto-assignment');
                return;
            }

            const existingUserRole = await this.prisma.userRole.findFirst({
                where: { user_id: tenantUserId, role_id: tenantRole.id },
            });
            if (existingUserRole) {
                return; // User already has TENANT role — skip silently
            }

            await this.prisma.userRole.create({
                data: {
                    user_id: tenantUserId,
                    role_id: tenantRole.id,
                    auto_assigned: true,
                },
            });

            await this.prisma.user.update({
                where: { id: tenantUserId },
                data: { user_type: 'BOTH' },
            });

            this.auditLogger.log({
                userId: tenantUserId,
                action: 'ROLE_AUTO_ASSIGNED',
                resource: 'UserRole',
                resourceId: tenantRole.id,
                timestamp: new Date(),
                metadata: { roleName: 'TENANT' },
            });
        } catch (error: unknown) {
            // Handle unique constraint violation silently (race condition: role was assigned concurrently)
            const prismaError = error as { code?: string };
            if (prismaError.code === 'P2002') {
                return;
            }
            throw error;
        }
    }
}
