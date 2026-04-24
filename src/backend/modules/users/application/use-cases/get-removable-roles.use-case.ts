import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import { RemovableRoleDto } from '@modules/users/application/dtos/removable-role.dto';
import { USER_REPOSITORY } from './register-user.use-case';

@Injectable()
export class GetRemovableRolesUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    ) { }

    async execute(userId: string): Promise<RemovableRoleDto[]> {
        const userRoles = await this.userRepository.findUserRoles(userId);
        const results: RemovableRoleDto[] = [];

        for (const role of userRoles) {
            const reasons = await this.checkRemovability(userId, role.name, userRoles.length);

            const dto = new RemovableRoleDto();
            dto.roleName = role.name;
            dto.removable = reasons.length === 0;
            dto.reasons = reasons;
            results.push(dto);
        }

        return results;
    }

    private async checkRemovability(userId: string, roleName: string, roleCount: number): Promise<string[]> {
        const reasons: string[] = [];

        if (roleCount <= 1) {
            reasons.push('Debes tener al menos un rol');
            return reasons;
        }

        if (roleName === 'TENANT') {
            const [hasLeases, hasContracts, hasPendingPayments] = await Promise.all([
                this.userRepository.hasActiveLeases(userId),
                this.userRepository.hasActiveContractsAsRole(userId, 'TENANT'),
                this.userRepository.hasPendingPayments(userId),
            ]);

            if (hasLeases) reasons.push('Tienes arriendos activos');
            if (hasContracts) reasons.push('Tienes contratos activos como arrendatario');
            if (hasPendingPayments) reasons.push('Tienes pagos pendientes');
        } else if (roleName === 'LANDLORD') {
            const [hasPortfolios, hasLeasesInPortfolios, hasContracts] = await Promise.all([
                this.userRepository.hasPortfoliosWithUnits(userId),
                this.userRepository.hasActiveLeasesInPortfolios(userId),
                this.userRepository.hasActiveContractsAsRole(userId, 'LANDLORD'),
            ]);

            if (hasPortfolios) reasons.push('Tienes portafolios con unidades');
            if (hasLeasesInPortfolios) reasons.push('Tienes arriendos activos en tus portafolios');
            if (hasContracts) reasons.push('Tienes contratos activos como arrendador');
        }

        return reasons;
    }
}
