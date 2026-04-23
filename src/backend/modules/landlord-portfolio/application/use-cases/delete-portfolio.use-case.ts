import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { PORTFOLIO_REPOSITORY } from './create-portfolio-unit.use-case';

@Injectable()
export class DeletePortfolioUseCase {
    constructor(
        @Inject(PORTFOLIO_REPOSITORY)
        private readonly repository: IPortfolioRepository,
    ) { }

    async execute(
        portfolioId: string,
        userId: string,
        userRoles: string[],
    ): Promise<void> {
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

        const unitCount = await this.repository.countUnitsByPortfolioId(portfolioId);
        if (unitCount > 0) {
            throw new ConflictException('El portafolio tiene unidades asociadas y no puede ser eliminado');
        }

        await this.repository.deletePortfolio(portfolioId);
    }
}
