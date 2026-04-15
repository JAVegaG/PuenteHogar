import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { UserEntity } from '@modules/users/domain/entities/user.entity';
import {
  CreateUserData,
  IUserRepository,
} from '@modules/users/domain/ports/user-repository.port';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { users_roles: { include: { role: true } } },
    });
    return user ? this.toEntity(user) : null;
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
