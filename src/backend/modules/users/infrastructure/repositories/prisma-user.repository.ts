import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma-generated/client';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import {
  CreateUserData,
  IUserRepository,
} from '@modules/users/domain/ports/user-repository.port';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findByMail(mail: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { mail },
      include: { users_roles: { include: { role: true } } },
    });
    return user ? this.toEntity(user) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        users_roles: { include: { role: true } },
        natural_person: true,
        legal_person: true,
      },
    });
    return user ? this.toEntity(user) : null;
  }

  async findDisplayName(userId: string): Promise<string | null> {
    const natural = await this.prisma.naturalPersonDetail.findUnique({
      where: { user_id: userId },
    });
    if (natural) {
      return natural.preferred_name || `${natural.first_name} ${natural.last_name}`;
    }
    const legal = await this.prisma.legalPersonDetail.findUnique({
      where: { user_id: userId },
    });
    if (legal) {
      return legal.business_name;
    }
    return null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          mail: data.mail,
          hashed_password: data.hashedPassword,
          user_type: data.userType,
          document_type_id: data.documentTypeId,
          document_number: data.documentNumber,
          phone_number: data.phoneNumber,
        },
      });

      await tx.userRole.create({
        data: {
          user_id: created.id,
          role_id: data.roleId,
        },
      });

      if (data.personType === 'natural' && data.naturalDetails) {
        await tx.naturalPersonDetail.create({
          data: {
            user_id: created.id,
            first_name: data.naturalDetails.firstName,
            last_name: data.naturalDetails.lastName,
            preferred_name: data.naturalDetails.preferredName ?? null,
          },
        });
      } else if (data.personType === 'legal' && data.legalDetails) {
        await tx.legalPersonDetail.create({
          data: {
            user_id: created.id,
            business_name: data.legalDetails.businessName,
          },
        });
      }

      await tx.usersRaw.create({
        data: {
          payload: JSON.stringify(data),
          processed: false,
        },
      });

      return created;
    });

    const full = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { users_roles: { include: { role: true } } },
    });

    return this.toEntity(full);
  }

  async findRoleByName(name: string): Promise<{ id: string; name: string } | null> {
    const role = await this.prisma.role.findUnique({ where: { name } });
    return role ? { id: role.id, name: role.name } : null;
  }

  async findDocumentTypeByCode(code: string): Promise<{ id: string; code: string } | null> {
    const dt = await this.prisma.documentType.findUnique({ where: { code } });
    return dt ? { id: dt.id, code: dt.code } : null;
  }

  async findAllDocumentTypes(): Promise<{ id: string; code: string; description: string }[]> {
    const types = await this.prisma.documentType.findMany({
      where: { is_active: true },
      orderBy: { code: 'asc' },
    });
    return types.map((t) => ({ id: t.id, code: t.code, description: t.description }));
  }

  async addRoleToUser(userId: string, roleId: string, autoAssigned: boolean): Promise<void> {
    await this.prisma.userRole.create({
      data: {
        user_id: userId,
        role_id: roleId,
        auto_assigned: autoAssigned,
      },
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({
      where: { user_id: userId, role_id: roleId },
    });
  }

  async updateUserType(userId: string, userType: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { user_type: userType },
    });
  }

  async findUserRoles(userId: string): Promise<{ id: string; name: string; autoAssigned: boolean }[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ({
      id: ur.id,
      name: ur.role.name,
      autoAssigned: ur.auto_assigned,
    }));
  }

  async findUserRoleRecord(userId: string, roleName: string): Promise<{ id: string; roleId: string; autoAssigned: boolean } | null> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        user_id: userId,
        role: { name: roleName },
      },
      include: { role: true },
    });
    return userRole
      ? { id: userRole.id, roleId: userRole.role_id, autoAssigned: userRole.auto_assigned }
      : null;
  }

  async hasActiveLeases(userId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM "landlord_portfolio"."Lease" l
        INNER JOIN "tracking_process"."LeaseCurrentStatus" lcs ON lcs."lease_id" = l."id"
        INNER JOIN "tracking_process"."LeaseStatus" ls ON ls."id" = lcs."lease_status_id"
        WHERE l."user_id" = ${userId}
          AND ls."name" IN ('Vigente', 'Acordado')
      `,
    );
    return Number(result[0].count) > 0;
  }

  async hasActiveContractsAsRole(userId: string, role: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM "contracts"."ContractParty" cp
        INNER JOIN "contracts"."Contract" c ON c."id" = cp."contract_id"
        INNER JOIN "contracts"."ContractStatus" cs ON cs."id" = c."contract_status_id"
        WHERE cp."user_id" = ${userId}
          AND cp."role_in_contract" = ${role}
          AND cs."name" != 'SIGNED'
      `,
    );
    return Number(result[0].count) > 0;
  }

  async hasPendingPayments(userId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM "payments"."ScheduledPayment" sp
        INNER JOIN "landlord_portfolio"."Lease" l ON l."id" = sp."lease_id"
        WHERE l."user_id" = ${userId}
          AND NOT EXISTS (
            SELECT 1 FROM "payments"."Payment" p
            WHERE p."scheduled_payment_id" = sp."id"
          )
      `,
    );
    return Number(result[0].count) > 0;
  }

  async hasPortfoliosWithUnits(userId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM "landlord_portfolio"."LandlordPortfolio" lp
        INNER JOIN "landlord_portfolio"."PortfolioUnit" pu ON pu."portfolio_id" = lp."id"
        WHERE lp."user_id" = ${userId}
      `,
    );
    return Number(result[0].count) > 0;
  }

  async hasActiveLeasesInPortfolios(userId: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM "landlord_portfolio"."LandlordPortfolio" lp
        INNER JOIN "landlord_portfolio"."PortfolioUnit" pu ON pu."portfolio_id" = lp."id"
        INNER JOIN "landlord_portfolio"."Lease" l ON l."portfolio_unit_id" = pu."id"
        INNER JOIN "tracking_process"."LeaseCurrentStatus" lcs ON lcs."lease_id" = l."id"
        INNER JOIN "tracking_process"."LeaseStatus" ls ON ls."id" = lcs."lease_status_id"
        WHERE lp."user_id" = ${userId}
          AND ls."name" IN ('Vigente', 'Acordado')
      `,
    );
    return Number(result[0].count) > 0;
  }

  async countUserRoles(userId: string): Promise<number> {
    return this.prisma.userRole.count({
      where: { user_id: userId },
    });
  }

  private toEntity(user: {
    id: string;
    mail: string;
    hashed_password: string;
    is_active: boolean;
    user_type: string;
    document_type_id: string;
    document_number: string;
    phone_number: string;
    users_roles: Array<{ role: { name: string } }>;
  }): UserEntity {
    return new UserEntity(
      user.id,
      user.mail,
      user.hashed_password,
      user.users_roles.map((ur) => ur.role.name),
      user.is_active,
      user.user_type,
      user.document_type_id,
      user.document_number,
      user.phone_number,
    );
  }
}
