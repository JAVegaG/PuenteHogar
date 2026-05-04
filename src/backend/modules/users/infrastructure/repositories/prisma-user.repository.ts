import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import {
  CreateUserData,
  IUserRepository,
} from '@modules/users/domain/ports/user-repository.port';
import * as PortfolioPort from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import * as ContractsPort from '@modules/contracts/domain/ports/cross-module-query.port';
import * as PaymentsPort from '@modules/payments/domain/ports/cross-module-query.port';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PortfolioPort.PORTFOLIO_CROSS_MODULE_QUERY)
    private readonly portfolioQuery: PortfolioPort.IPortfolioCrossModuleQuery,
    @Inject(ContractsPort.CONTRACTS_CROSS_MODULE_QUERY)
    private readonly contractsQuery: ContractsPort.IContractsCrossModuleQuery,
    @Inject(PaymentsPort.PAYMENTS_CROSS_MODULE_QUERY)
    private readonly paymentsQuery: PaymentsPort.IPaymentsCrossModuleQuery,
  ) { }

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
          payload: data as any,
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
    return this.portfolioQuery.hasActiveLeases(userId);
  }

  async hasActiveContractsAsRole(userId: string, role: string): Promise<boolean> {
    return this.contractsQuery.hasActiveContractsAsRole(userId, role);
  }

  async hasPendingPayments(userId: string): Promise<boolean> {
    return this.paymentsQuery.hasPendingPayments(userId);
  }

  async hasPortfoliosWithUnits(userId: string): Promise<boolean> {
    return this.portfolioQuery.hasPortfoliosWithUnits(userId);
  }

  async hasActiveLeasesInPortfolios(userId: string): Promise<boolean> {
    return this.portfolioQuery.hasActiveLeasesInPortfolios(userId);
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
