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
export class AddRoleUseCase {
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
        if (existingRecord) {
            throw new ConflictException(`El usuario ya tiene el rol '${roleName}'`);
        }

        await this.userRepository.addRoleToUser(userId, role.id, false);
        await this.userRepository.updateUserType(userId, 'BOTH');

        const updatedRoles = await this.userRepository.findUserRoles(userId);
        const roleNames = updatedRoles.map((r) => r.name);

        const payload = { sub: userId, roles: roleNames };
        const accessToken = this.jwtService.sign(payload);

        this.auditLogger.log({
            userId,
            action: 'ROLE_ADDED',
            resource: 'UserRole',
            resourceId: role.id,
            timestamp: new Date(),
            metadata: { roleName },
        });

        const response = new RoleChangeResponseDto();
        response.accessToken = accessToken;
        response.roles = roleNames;
        return response;
    }
}
