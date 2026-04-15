import type { NotificationChannel, NotificationPreferenceEntity } from '../entities/notification-preference.entity';

export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING';

export interface NotificationRecord {
  userId: string;
  notificationTypeId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  eventSource: string;
  payload: Record<string, unknown>;
  sentAt?: Date;
}

export interface INotificationRepository {
  findPreferencesByUserId(userId: string): Promise<NotificationPreferenceEntity[]>;
  findPreferenceByUserAndType(
    userId: string,
    notificationTypeId: string,
  ): Promise<NotificationPreferenceEntity | null>;
  upsertPreference(
    userId: string,
    notificationTypeId: string,
    channel: NotificationChannel,
    isActive: boolean,
  ): Promise<void>;
  findNotificationTypeByName(name: string): Promise<{ id: string; name: string } | null>;
  persistNotification(record: NotificationRecord): Promise<void>;
}
