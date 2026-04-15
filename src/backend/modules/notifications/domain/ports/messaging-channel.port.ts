import type { NotificationChannel } from '../entities/notification-preference.entity';

export interface MessagePayload {
  userId: string;
  channel: NotificationChannel;
  eventSource: string;
  data: Record<string, unknown>;
}

export interface IMessagingChannel {
  send(payload: MessagePayload): Promise<void>;
}
