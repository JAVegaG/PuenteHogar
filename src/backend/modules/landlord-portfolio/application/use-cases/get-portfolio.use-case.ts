import { Inject, Injectable } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { PortfolioUnitResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-unit-response.dto';
import { PortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/portfolio-unit.entity';
import { PORTFOLIO_REPOSITORY } from '@modules/landlord-portfolio/application/use-cases/create-portfolio-unit.use-case';

@Injectable()
export class GetPortfolioUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
  ) { }

  async execute(userId: string): Promise<PortfolioUnitResponseDto[]> {
    const units = await this.portfolioRepository.findUnitsByUserId(userId);
    return units.map((unit) => this.toResponseDto(unit));
  }

  private toResponseDto(entity: PortfolioUnitEntity): PortfolioUnitResponseDto {
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
    return dto;
  }
}
