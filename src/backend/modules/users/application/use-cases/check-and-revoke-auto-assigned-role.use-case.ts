import { Inject, Injectable } from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import { USER_REPOSITORY } from './register-user.use-case';

@Injectable()
export class CheckAndRevokeAutoAssignedRoleUseCase {
    constructor(
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
        private readonly auditLogger: AuditLoggerService,
    ) { }

    async execute(userId: string, roleName: string): Promise<{ revoked: boolean }> {
        // 1. Find the UserRole record for (userId, roleName)
        const roleRecord = await this.userRepository.findUserRoleRecord(userId, roleName);

        // 2. If not found → return { revoked: false }
        if (!roleRecord) {
            return { revoked: false };
        }

        // 3. If auto_assigned = false → return { revoked: false } (user added it manually)
        if (!roleRecord.autoAssigned) {
            return { revoked: false };
        }

        // 4. Check if user has other active leases (status "Vigente" or "Acordado") as tenant
        const hasLeases = await this.userRepository.hasActiveLeases(userId);

        // 5. If has active leases → return { revoked: false }
        if (hasLeases) {
            return { revoked: false };
        }

        // 6. Check if user has only this one role (must keep at least one)
        const roleCount = await this.userRepository.countUserRoles(userId);

        // 7. If only role → return { revoked: false }
        if (roleCount <= 1) {
            return { revoked: false };
        }

        // 8. Delete UserRole record
        await this.userRepository.removeRoleFromUser(userId, roleRecord.roleId);

        // 9. Get remaining roles, update user_type to remaining role
        const remainingRoles = await this.userRepository.findUserRoles(userId);
        const remainingRoleName = remainingRoles[0]?.name ?? roleName;
        await this.userRepository.updateUserType(userId, remainingRoleName);

        // 10. Log audit event ROLE_AUTO_REVOKED
        this.auditLogger.log({
            userId,
            action: 'ROLE_AUTO_REVOKED',
            resource: 'UserRole',
            resourceId: roleRecord.roleId,
            timestamp: new Date(),
            metadata: { userId, roleName },
        });

        // 11. Return { revoked: true }
        return { revoked: true };
    }
}
