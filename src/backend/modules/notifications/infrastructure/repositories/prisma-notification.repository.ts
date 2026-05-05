import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteData, softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
import { InAppNotificationEntity } from '../../domain/entities/in-app-notification.entity';
import { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import { NotificationTypeEntity } from '../../domain/entities/notification-type.entity';
import type { NotificationChannel } from '../../domain/entities/notification-preference.entity';
import type {
  CreateInAppNotificationData,
  INotificationRepository,
  NotificationRecord,
} from '../../domain/ports/notification-repository.port';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) { }

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

  async createInAppNotification(data: CreateInAppNotificationData): Promise<InAppNotificationEntity> {
    const record = await this.prisma.inAppNotification.create({
      data: {
        user_id: data.userId,
        notification_type_id: data.notificationTypeId,
        title: data.title,
        message: data.message,
        read: false,
        event_source: data.eventSource,
        data: data.data as object,
      },
    });

    return new InAppNotificationEntity(
      record.id,
      record.user_id,
      record.notification_type_id,
      record.title,
      record.message,
      record.read,
      record.event_source,
      record.data as Record<string, unknown>,
      record.created_at,
    );
  }

  async findInAppNotificationsByUserId(userId: string): Promise<InAppNotificationEntity[]> {
    const records = await this.prisma.inAppNotification.findMany({
      where: { user_id: userId, ...softDeleteFilter },
      orderBy: { created_at: 'desc' },
    });

    return records.map(
      (r: typeof records[number]) =>
        new InAppNotificationEntity(
          r.id,
          r.user_id,
          r.notification_type_id,
          r.title,
          r.message,
          r.read,
          r.event_source,
          r.data as Record<string, unknown>,
          r.created_at,
        ),
    );
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.prisma.inAppNotification.count({
      where: { user_id: userId, read: false, ...softDeleteFilter },
    });
  }

  async markAsRead(id: string, userId: string): Promise<InAppNotificationEntity | null> {
    const existing = await this.prisma.inAppNotification.findFirst({
      where: { id, user_id: userId, ...softDeleteFilter },
    });

    if (!existing) return null;

    const record = await this.prisma.inAppNotification.update({
      where: { id },
      data: { read: true },
    });

    return new InAppNotificationEntity(
      record.id,
      record.user_id,
      record.notification_type_id,
      record.title,
      record.message,
      record.read,
      record.event_source,
      record.data as Record<string, unknown>,
      record.created_at,
    );
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.inAppNotification.updateMany({
      where: { user_id: userId, read: false, ...softDeleteFilter },
      data: { read: true },
    });

    return result.count;
  }

  async softDeleteNotification(id: string, userId: string): Promise<void> {
    const notification = await this.prisma.inAppNotification.findFirst({
      where: { id, ...softDeleteFilter },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }

    if (notification.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this notification');
    }

    await this.prisma.inAppNotification.update({
      where: { id },
      data: softDeleteData(),
    });
  }

  async softDeleteAllReadByUserId(userId: string): Promise<number> {
    const result = await this.prisma.inAppNotification.updateMany({
      where: {
        user_id: userId,
        read: true,
        ...softDeleteFilter,
      },
      data: softDeleteData(),
    });
    return result.count;
  }

  async findAllNotificationTypes(): Promise<NotificationTypeEntity[]> {
    const records = await this.prisma.notificationType.findMany();

    return records.map(
      (r: typeof records[number]) =>
        new NotificationTypeEntity(r.id, r.name, r.description),
    );
  }

  async findActiveExternalPreferences(
    userId: string,
    notificationTypeId: string,
  ): Promise<NotificationPreferenceEntity[]> {
    const records = await this.prisma.notificationPreference.findMany({
      where: {
        user_id: userId,
        notification_type_id: notificationTypeId,
        is_active: true,
      },
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
}
