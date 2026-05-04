import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { parsePayload } from '@src/shared/etl/parse-payload';

interface UsersRawPayload {
  mail: string;
  hashedPassword: string;
  userType: string;
  documentTypeId: string;
  documentNumber: string;
  phoneNumber: string;
  roleId: string;
  personType: 'natural' | 'legal';
  naturalDetails?: {
    firstName: string;
    lastName: string;
    preferredName?: string;
  };
  legalDetails?: {
    businessName: string;
  };
}

@Injectable()
export class UsersEtlService {
  private readonly logger = new Logger(UsersEtlService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async processUsersRaw(): Promise<void> {
    const records = await this.prisma.usersRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL users: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = parsePayload<UsersRawPayload>(record.payload);
        this.validateUsersPayload(payload);

        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              mail: payload.mail,
              hashed_password: payload.hashedPassword,
              user_type: payload.userType,
              document_type_id: payload.documentTypeId,
              document_number: payload.documentNumber,
              phone_number: payload.phoneNumber,
            },
          });

          await tx.userRole.create({
            data: { user_id: user.id, role_id: payload.roleId },
          });

          if (payload.personType === 'natural' && payload.naturalDetails) {
            await tx.naturalPersonDetail.create({
              data: {
                user_id: user.id,
                first_name: payload.naturalDetails.firstName,
                last_name: payload.naturalDetails.lastName,
                preferred_name: payload.naturalDetails.preferredName,
              },
            });
          } else if (payload.personType === 'legal' && payload.legalDetails) {
            await tx.legalPersonDetail.create({
              data: {
                user_id: user.id,
                business_name: payload.legalDetails.businessName,
              },
            });
          }

          await tx.usersRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL users: error processing record ${record.id}: ${reason}`);
        await this.prisma.usersRaw.update({
          where: { id: record.id },
          data: { processed: true }, // mark to avoid reprocessing; error logged above
        });
      }
    }

    this.logger.log(`ETL users: finished processing batch`);
  }

  private validateUsersPayload(payload: UsersRawPayload): void {
    if (!payload.mail) throw new Error('Missing field: mail');
    if (!payload.hashedPassword) throw new Error('Missing field: hashedPassword');
    if (!payload.userType) throw new Error('Missing field: userType');
    if (!payload.documentTypeId) throw new Error('Missing field: documentTypeId');
    if (!payload.documentNumber) throw new Error('Missing field: documentNumber');
    if (!payload.phoneNumber) throw new Error('Missing field: phoneNumber');
    if (!payload.roleId) throw new Error('Missing field: roleId');
    if (!payload.personType) throw new Error('Missing field: personType');
  }
}
