export type NotificationChannel = 'EMAIL' | 'WHATSAPP';

export class NotificationPreferenceEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly notificationTypeId: string,
    public readonly channel: NotificationChannel,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
