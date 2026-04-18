import { Inject, Injectable } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { ListPortfoliosQueryDto } from '@modules/landlord-portfolio/application/dtos/list-portfolios-query.dto';
import { PaginatedPortfoliosResponseDto } from '@modules/landlord-portfolio/application/dtos/paginated-portfolios-response.dto';
import { PortfolioSummaryResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-summary-response.dto';
import { PORTFOLIO_REPOSITORY } from './create-portfolio-unit.use-case';

@Injectable()
export class ListPortfoliosUseCase {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: IPortfolioRepository,
  ) {}

  async execute(
    userId: string,
    query: ListPortfoliosQueryDto,
  ): Promise<PaginatedPortfoliosResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 6;

    const [{ portfolios, total }, globalStats] = await Promise.all([
      this.portfolioRepository.findPortfoliosByUserId(userId, page, limit),
      this.portfolioRepository.getGlobalStats(userId),
    ]);

    const response = new PaginatedPortfoliosResponseDto();
    response.data = portfolios.map((p) => {
      const dto = new PortfolioSummaryResponseDto();
      dto.id = p.id;
      dto.name = p.name;
      dto.description = p.description;
      dto.propertyType = p.propertyType;
      dto.creationDate = p.creationDate;
      dto.totalUnits = p.totalUnits;
      dto.activeLeases = p.activeLeases;
      dto.occupancyPercentage = p.occupancyPercentage;
      return dto;
    });
    response.total = total;
    response.page = page;
    response.limit = limit;
    response.totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    response.globalTotalUnits = globalStats.totalUnits;
    response.globalActiveLeases = globalStats.activeLeases;

    return response;
  }
}
