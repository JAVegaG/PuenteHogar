import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';

interface NotificationPreferencePayload {
  userId: string;
  notificationTypeId: string;
  channel: string;
  isActive?: boolean;
}

interface NotificationsRawPayload {
  preference: NotificationPreferencePayload;
}

@Injectable()
export class NotificationsEtlService {
  private readonly logger = new Logger(NotificationsEtlService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processNotificationsRaw(): Promise<void> {
    const records = await this.prisma.notificationsRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL notifications: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = record.payload as unknown as NotificationsRawPayload;
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          await tx.notificationPreference.create({
            data: {
              user_id: payload.preference.userId,
              notification_type_id: payload.preference.notificationTypeId,
              channel: payload.preference.channel,
              is_active: payload.preference.isActive ?? true,
            },
          });

          await tx.notificationsRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL notifications: error on record ${record.id}: ${reason}`);
        await this.prisma.notificationsRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL notifications: finished processing batch`);
  }

  private validatePayload(payload: NotificationsRawPayload): void {
    if (!payload.preference) throw new Error('Missing field: preference');
    if (!payload.preference.userId) throw new Error('Missing field: preference.userId');
    if (!payload.preference.notificationTypeId) throw new Error('Missing field: preference.notificationTypeId');
    if (!payload.preference.channel) throw new Error('Missing field: preference.channel');
  }
}
