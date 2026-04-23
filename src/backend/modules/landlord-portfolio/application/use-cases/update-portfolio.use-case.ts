import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { UpdatePortfolioDto } from '@modules/landlord-portfolio/application/dtos/update-portfolio.dto';
import { PortfolioSummaryResponseDto } from '@modules/landlord-portfolio/application/dtos/portfolio-summary-response.dto';
import { PORTFOLIO_REPOSITORY } from './create-portfolio-unit.use-case';

@Injectable()
export class UpdatePortfolioUseCase {
    constructor(
        @Inject(PORTFOLIO_REPOSITORY)
        private readonly repository: IPortfolioRepository,
    ) { }

    async execute(
        portfolioId: string,
        dto: UpdatePortfolioDto,
        userId: string,
        userRoles: string[],
    ): Promise<PortfolioSummaryResponseDto> {
        if (!userRoles.includes('LANDLORD')) {
            throw new ForbiddenException('Acceso denegado');
        }

        const portfolio = await this.repository.findPortfolioById(portfolioId);
        if (!portfolio) {
            throw new NotFoundException('Portafolio no encontrado');
        }

        if (portfolio.userId !== userId) {
            throw new ForbiddenException('Acceso denegado');
        }

        const updated = await this.repository.updatePortfolio(portfolioId, {
            name: dto.name,
            description: dto.description,
        });

        const response = new PortfolioSummaryResponseDto();
        response.id = updated.id;
        response.name = updated.name;
        response.description = updated.description;
        response.creationDate = updated.creationDate;
        response.totalUnits = 0;
        response.activeLeases = 0;
        response.occupancyPercentage = 0;

        return response;
    }
}
