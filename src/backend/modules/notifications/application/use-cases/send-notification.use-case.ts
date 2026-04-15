import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import type { IMessagingChannel } from '../../domain/ports/messaging-channel.port';
import type { SendNotificationDto } from '../dtos/send-notification.dto';
import type { NotificationChannel } from '../../domain/entities/notification-preference.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';
export const MESSAGING_CHANNEL = 'MESSAGING_CHANNEL';

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

/**
 * SendNotificationUseCase
 *
 * Determines the user's preferred channel, sends the notification via that channel,
 * retries up to 2 times with exponential backoff on failure, persists the notification
 * with its final status, and logs definitive failures to the audit log without
 * interrupting the calling flow (fire-and-forget).
 *
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6
 */
@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(MESSAGING_CHANNEL)
    private readonly messagingChannel: IMessagingChannel,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(dto: SendNotificationDto): Promise<void> {
    const notificationType = await this.repository.findNotificationTypeByName(
      dto.notificationTypeName,
    );

    if (!notificationType) {
      this.logger.warn(`Notification type not found: ${dto.notificationTypeName}`);
      return;
    }

    // Determine preferred channel (Req 9.2)
    const preference = await this.repository.findPreferenceByUserAndType(
      dto.userId,
      notificationType.id,
    );

    // Default to WHATSAPP if no preference set
    const channel: NotificationChannel =
      preference?.isActive === false
        ? 'EMAIL' // fallback if preferred channel is disabled
        : (preference?.channel ?? 'WHATSAPP');

    // Check if the resolved channel is also disabled (Req 9.6)
    const allPreferences = await this.repository.findPreferencesByUserId(dto.userId);
    const channelPref = allPreferences.find(
      (p) => p.notificationTypeId === notificationType.id && p.channel === channel,
    );
    if (channelPref && !channelPref.isActive) {
      this.logger.log(
        `Notification suppressed for user ${dto.userId} — channel ${channel} is disabled`,
      );
      await this.repository.persistNotification({
        userId: dto.userId,
        notificationTypeId: notificationType.id,
        channel,
        status: 'FAILED',
        eventSource: dto.eventSource,
        payload: dto.data ?? {},
      });
      return;
    }

    const payload = {
      userId: dto.userId,
      channel,
      eventSource: dto.eventSource,
      data: dto.data ?? {},
    };

    let sent = false;
    let lastError: unknown;

    // Retry up to MAX_RETRIES with exponential backoff (Req 9.3)
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Notification retry ${attempt}/${MAX_RETRIES} for user ${dto.userId} — waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      try {
        await this.messagingChannel.send(payload);
        sent = true;
        break;
      } catch (err) {
        lastError = err;
        this.logger.error(
          `Notification attempt ${attempt + 1} failed for user ${dto.userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Persist notification with final status (Req 9.4)
    await this.repository.persistNotification({
      userId: dto.userId,
      notificationTypeId: notificationType.id,
      channel,
      status: sent ? 'SENT' : 'FAILED',
      eventSource: dto.eventSource,
      payload: dto.data ?? {},
      sentAt: sent ? new Date() : undefined,
    });

    // Log definitive failure to audit log without interrupting flow (Req 9.5)
    if (!sent) {
      this.auditLogger.log({
        userId: dto.userId,
        action: 'NOTIFICATION_FAILED',
        resource: 'Notification',
        timestamp: new Date(),
        metadata: {
          notificationType: dto.notificationTypeName,
          channel,
          eventSource: dto.eventSource,
          error: lastError instanceof Error ? lastError.message : String(lastError),
        },
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
