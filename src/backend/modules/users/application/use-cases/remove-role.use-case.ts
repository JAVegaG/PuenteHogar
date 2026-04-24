import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import { RoleChangeResponseDto } from '@modules/users/application/dtos/role-change-response.dto';
import { USER_REPOSITORY } from './register-user.use-case';

@Injectable()
export class RemoveRoleUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
        private readonly jwtService: JwtService,
        private readonly auditLogger: AuditLoggerService,
    ) { }

    async execute(userId: string, roleName: string): Promise<RoleChangeResponseDto> {
        const role = await this.userRepository.findRoleByName(roleName);
        if (!role) {
            throw new BadRequestException(`Rol '${roleName}' no encontrado`);
        }

        const existingRecord = await this.userRepository.findUserRoleRecord(userId, roleName);
        if (!existingRecord) {
            throw new BadRequestException(`El usuario no tiene el rol '${roleName}'`);
        }

        const roleCount = await this.userRepository.countUserRoles(userId);
        if (roleCount <= 1) {
            throw new BadRequestException('El usuario debe tener al menos un rol');
        }

        const reasons = await this.checkRemovability(userId, roleName);
        if (reasons.length > 0) {
            throw new ConflictException(
                `No se puede eliminar el rol ${roleName}: ${reasons.join(', ')}`,
            );
        }

        await this.userRepository.removeRoleFromUser(userId, existingRecord.roleId);

        const updatedRoles = await this.userRepository.findUserRoles(userId);
        const roleNames = updatedRoles.map((r) => r.name);
        const remainingRole = roleNames[0] ?? roleName;

        await this.userRepository.updateUserType(userId, remainingRole);

        const payload = { sub: userId, roles: roleNames };
        const accessToken = this.jwtService.sign(payload);

        this.auditLogger.log({
            userId,
            action: 'ROLE_REMOVED',
            resource: 'UserRole',
            resourceId: existingRecord.roleId,
            timestamp: new Date(),
            metadata: { roleName },
        });

        const response = new RoleChangeResponseDto();
        response.accessToken = accessToken;
        response.roles = roleNames;
        return response;
    }

    private async checkRemovability(userId: string, roleName: string): Promise<string[]> {
        const reasons: string[] = [];

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
