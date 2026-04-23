import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import { PORTFOLIO_REPOSITORY } from './create-portfolio-unit.use-case';

@Injectable()
export class DeleteUnitUseCase {
    constructor(
        @Inject(PORTFOLIO_REPOSITORY)
        private readonly repository: IPortfolioRepository,
    ) { }

    async execute(
        portfolioId: string,
        unitId: string,
        userId: string,
    ): Promise<void> {
        const unit = await this.repository.findUnitById(unitId);
        if (!unit) {
            throw new NotFoundException('Unidad no encontrada');
        }

        const ownerUserId = await this.repository.getPortfolioOwnerUserId(unitId);
        if (ownerUserId !== userId) {
            throw new ForbiddenException('Acceso denegado');
        }

        const hasActive = await this.repository.hasActiveLeases(unitId);
        if (hasActive) {
            throw new ConflictException('La unidad tiene arriendos activos y no puede ser eliminada');
        }

        await this.repository.deleteUnit(unitId);
    }
}
