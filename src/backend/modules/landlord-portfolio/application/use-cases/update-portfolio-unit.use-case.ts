import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { UpdatePortfolioUnitDto } from '@modules/landlord-portfolio/application/dtos/update-portfolio-unit.dto';
import { PortfolioUnitResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto';
import { PortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/portfolio-unit.entity';
import { PORTFOLIO_REPOSITORY } from '@modules/landlord-portfolio/application/use-cases/create-portfolio-unit.use-case';

@Injectable()
export class UpdatePortfolioUnitUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(
    unitId: string,
    dto: UpdatePortfolioUnitDto,
    userId: string,
  ): Promise<PortfolioUnitResponseDto> {
    const ownerUserId = await this.portfolioRepository.getPortfolioOwnerUserId(unitId);

    if (ownerUserId === null) {
      throw new NotFoundException('Unidad de portafolio no encontrada');
    }

    if (ownerUserId !== userId) {
      this.auditLogger.log({
        userId,
        action: 'UNAUTHORIZED_PORTFOLIO_UNIT_UPDATE',
        resource: 'PortfolioUnit',
        resourceId: unitId,
        timestamp: new Date(),
        metadata: { ownerId: ownerUserId },
      });
      throw new ForbiddenException('Acceso denegado');
    }

    const unit = await this.portfolioRepository.updateUnit(unitId, {
      ...dto,
      rawPayload: { ...dto },
    });
    return this.toResponseDto(unit);
  }

  private toResponseDto(entity: PortfolioUnitEntity): PortfolioUnitResponseDto {
    const dto = new PortfolioUnitResponseDto();
    dto.id = entity.id;
    dto.portfolioId = entity.portfolioId;
    dto.propertyId = entity.propertyId;
    dto.conditions = entity.conditions;
    dto.leaseBaseAmount = entity.leaseBaseAmount;
    dto.leaseBaseCurrency = entity.leaseBaseCurrency;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
