import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import type { NotificationChannel } from '../../domain/entities/notification-preference.entity';
import type {
  INotificationRepository,
  NotificationRecord,
} from '../../domain/ports/notification-repository.port';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPreferencesByUserId(userId: string): Promise<NotificationPreferenceEntity[]> {
    const records = await this.prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    return records.map(
      (r: typeof records[number]) =>
        new NotificationPreferenceEntity(
          r.id,
          r.user_id,
          r.notification_type_id,
          r.channel as NotificationChannel,
          r.is_active,
          r.created_at,
          r.updated_at,
        ),
    );
  }

  async findPreferenceByUserAndType(
    userId: string,
    notificationTypeId: string,
  ): Promise<NotificationPreferenceEntity | null> {
    const record = await this.prisma.notificationPreference.findFirst({
      where: { user_id: userId, notification_type_id: notificationTypeId, is_active: true },
    });

    if (!record) return null;

    return new NotificationPreferenceEntity(
      record.id,
      record.user_id,
      record.notification_type_id,
      record.channel as NotificationChannel,
      record.is_active,
      record.created_at,
      record.updated_at,
    );
  }

  async upsertPreference(
    userId: string,
    notificationTypeId: string,
    channel: NotificationChannel,
    isActive: boolean,
  ): Promise<void> {
    const existing = await this.prisma.notificationPreference.findFirst({
      where: { user_id: userId, notification_type_id: notificationTypeId, channel },
    });

    if (existing) {
      await this.prisma.notificationPreference.update({
        where: { id: existing.id },
        data: { is_active: isActive },
      });
    } else {
      await this.prisma.notificationPreference.create({
        data: {
          user_id: userId,
          notification_type_id: notificationTypeId,
          channel,
          is_active: isActive,
        },
      });
    }
  }

  async findNotificationTypeByName(name: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.notificationType.findUnique({ where: { name } });
  }

  async persistNotification(record: NotificationRecord): Promise<void> {
    // Persist to NotificationsRaw for ETL processing (Req 9.4, 10.1)
    await this.prisma.notificationsRaw.create({
      data: {
        payload: JSON.parse(
          JSON.stringify({
            userId: record.userId,
            notificationTypeId: record.notificationTypeId,
            channel: record.channel,
            status: record.status,
            eventSource: record.eventSource,
            data: record.payload,
            sentAt: record.sentAt?.toISOString() ?? null,
          }),
        ),
      },
    });
  }
}
