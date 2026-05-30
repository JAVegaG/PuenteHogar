import { Inject, Injectable } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { PortfolioUnitResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto';
import { PortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/portfolio-unit.entity';
import { PORTFOLIO_REPOSITORY } from '@modules/landlord-portfolio/application/use-cases/create-portfolio-unit.use-case';
import { PrismaService } from '@src/shared/prisma/prisma.service';

@Injectable()
export class GetPortfolioUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
    private readonly prisma: PrismaService,
  ) { }

  async execute(userId: string, portfolioId?: string): Promise<PortfolioUnitResponseDto[]> {
    const units = portfolioId
      ? await this.portfolioRepository.findUnitsByPortfolioId(portfolioId)
      : await this.portfolioRepository.findUnitsByUserId(userId);
    return Promise.all(units.map((unit) => this.toResponseDto(unit)));
  }

  private async toResponseDto(entity: PortfolioUnitEntity): Promise<PortfolioUnitResponseDto> {
    const dto = new PortfolioUnitResponseDto();
    dto.id = entity.id;
    dto.portfolioId = entity.portfolioId;
    dto.propertyId = entity.propertyId;
    dto.name = entity.name;
    dto.conditions = entity.conditions;
    dto.leaseBaseAmount = entity.leaseBaseAmount;
    dto.leaseBaseCurrency = entity.leaseBaseCurrency;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    // Resolve property details cross-schema
    const property = await this.prisma.property.findUnique({
      where: { id: entity.propertyId },
      include: { address: true },
    });

    if (property) {
      dto.propertyType = property.property_type;
      dto.numberOfRooms = property.number_of_rooms;
      dto.numberOfBathrooms = property.number_of_bathrooms;
      dto.address = property.address?.address ?? '';

      const length = property.length ? Number(property.length) : null;
      const width = property.width ? Number(property.width) : null;
      dto.area = length !== null && width !== null ? length * width : null;
    }

    // Resolve active lease (same schema — Lease has portfolio_unit_id)
    const activeLease = await this.prisma.lease.findFirst({
      where: { portfolio_unit_id: entity.id, end_date: null, deleted_at: null },
    });

    if (activeLease) {
      // Check tracking status — only CONTRACT_SIGNED or PAYMENT_RECEIVED means "Ocupado"
      const SIGNED_STATUSES = ['CONTRACT_SIGNED', 'PAYMENT_RECEIVED'];
      const currentStatus = await this.prisma.leaseCurrentStatus.findUnique({
        where: { lease_id: activeLease.id },
        include: { status: true },
      });

      const trackingStatusName = currentStatus?.status?.name;
      dto.trackingStatus = trackingStatusName ?? undefined;
      const isSignedOrBeyond = trackingStatusName != null && SIGNED_STATUSES.includes(trackingStatusName);

      if (isSignedOrBeyond) {
        dto.unitStatus = 'Ocupado';
        dto.monthlyRent = entity.leaseBaseAmount;

        // Resolve tenant name cross-schema
        const tenant = await this.prisma.user.findUnique({
          where: { id: activeLease.user_id },
          select: { id: true },
        });
        if (tenant) {
          const natural = await this.prisma.naturalPersonDetail.findFirst({
            where: { user_id: tenant.id },
          });
          if (natural) {
            dto.tenantName = `${natural.first_name} ${natural.last_name}`;
          } else {
            const legal = await this.prisma.legalPersonDetail.findFirst({
              where: { user_id: tenant.id },
            });
            dto.tenantName = legal?.business_name ?? null;
          }
        }
      } else {
        // Lease exists but tracking status is pre-signing — treat as "Disponible"
        dto.unitStatus = 'Disponible';
        dto.tenantName = null;
        dto.monthlyRent = null;
      }
    } else {
      dto.unitStatus = 'Disponible';
      dto.tenantName = null;
      dto.monthlyRent = null;
    }

    // Resolve active listing (cross-schema — Listing.portfolio_unit_id)
    const activeListing = await this.prisma.listing.findFirst({
      where: { portfolio_unit_id: entity.id, is_active: true },
      select: { id: true },
    });
    dto.hasActiveListing = !!activeListing;

    return dto;
  }
}
