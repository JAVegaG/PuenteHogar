import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { CreatePortfolioDto } from '@modules/landlord-portfolio/application/dtos/create-portfolio.dto';
import { PortfolioSummaryResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-summary-response.dto';
import { PORTFOLIO_REPOSITORY } from './create-portfolio-unit.use-case';

@Injectable()
export class CreatePortfolioUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
  ) {}

  async execute(
    dto: CreatePortfolioDto,
    userId: string,
    userRoles: string[],
  ): Promise<PortfolioSummaryResponseDto> {
    if (!userRoles.includes('LANDLORD')) {
      throw new ForbiddenException('Acceso denegado');
    }

    const portfolio = await this.portfolioRepository.createPortfolio({
      userId,
      name: dto.name,
      description: dto.description,
    });

    const response = new PortfolioSummaryResponseDto();
    response.id = portfolio.id;
    response.name = portfolio.name;
    response.description = portfolio.description;
    response.propertyType = null;
    response.creationDate = portfolio.creationDate;
    response.totalUnits = 0;
    response.activeLeases = 0;
    response.occupancyPercentage = 0;

    return response;
  }
}
