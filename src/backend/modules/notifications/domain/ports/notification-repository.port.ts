import type { NotificationChannel, NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import type { InAppNotificationEntity } from '../entities/in-app-notification.entity';
import type { NotificationTypeEntity } from '../entities/notification-type.entity';

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

export interface CreateInAppNotificationData {
  userId: string;
  notificationTypeId: string;
  title: string;
  message: string;
  eventSource: string;
  data: Record<string, unknown>;
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

  // In-app notification methods
  createInAppNotification(data: CreateInAppNotificationData): Promise<InAppNotificationEntity>;
  findInAppNotificationsByUserId(userId: string): Promise<InAppNotificationEntity[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<InAppNotificationEntity | null>;
  markAllAsRead(userId: string): Promise<number>;
  softDeleteNotification(id: string, userId: string): Promise<void>;
  softDeleteAllReadByUserId(userId: string): Promise<number>;
  findAllNotificationTypes(): Promise<NotificationTypeEntity[]>;
  findActiveExternalPreferences(userId: string, notificationTypeId: string): Promise<NotificationPreferenceEntity[]>;
}
