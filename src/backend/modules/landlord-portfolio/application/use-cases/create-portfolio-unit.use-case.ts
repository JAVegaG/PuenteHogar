import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { CreatePortfolioUnitDto } from '@modules/landlord-portfolio/application/dtos/create-portfolio-unit.dto';
import { PortfolioUnitResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto';
import { PortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/portfolio-unit.entity';

export const PORTFOLIO_REPOSITORY = 'PORTFOLIO_REPOSITORY';

@Injectable()
export class CreatePortfolioUnitUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
  ) {}

  async execute(
    dto: CreatePortfolioUnitDto,
    userId: string,
    userRoles: string[],
  ): Promise<PortfolioUnitResponseDto> {
    if (!userRoles.includes('LANDLORD')) {
      throw new ForbiddenException('Acceso denegado');
    }

    const portfolio = await this.portfolioRepository.findOrCreatePortfolio(userId);

    const unit = await this.portfolioRepository.createUnit({
      portfolioId: portfolio.id,
      propertyId: dto.propertyId,
      conditions: dto.conditions,
      leaseBaseAmount: dto.leaseBaseAmount,
      leaseBaseCurrency: dto.leaseBaseCurrency ?? 'COP',
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
