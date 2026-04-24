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
 * Builds Spanish notification content (title + message) from the notification type name and event data.
 */
export function buildNotificationContent(
  typeName: string,
  data: Record<string, unknown>,
): { title: string; message: string } {
  switch (typeName) {
    case 'CONTRACT_SIGNED':
      return {
        title: 'Contrato firmado',
        message: data.contractId
          ? `El contrato ${String(data.contractId)} ha sido firmado exitosamente.`
          : 'Un contrato ha sido firmado exitosamente.',
      };
    case 'PAYMENT_RECEIVED':
      return {
        title: 'Pago recibido',
        message: data.amount
          ? `Se ha recibido un pago por $${String(data.amount)}.`
          : 'Se ha recibido un pago.',
      };
    case 'CONTACT_INITIATED':
      return {
        title: 'Contacto iniciado',
        message: data.listingId
          ? `Se ha iniciado un contacto para el inmueble ${String(data.listingId)}.`
          : 'Se ha iniciado un nuevo contacto.',
      };
    case 'CONTRACT_UPLOADED':
      return {
        title: 'Contrato cargado',
        message: data.contractId
          ? `El contrato ${String(data.contractId)} ha sido cargado.`
          : 'Un contrato ha sido cargado.',
      };
    default:
      return {
        title: typeName,
        message: `Notificación: ${typeName}`,
      };
  }
}

/**
 * SendNotificationUseCase
 *
 * 1. Resolves the notification type by name
 * 2. Builds notification content using buildNotificationContent helper
 * 3. Always creates an in-app notification (read: false)
 * 4. Queries active external preferences and sends only for active channels
 * 5. Maintains retry/backoff logic for external channels
 *
 * Requirements: 2.8, 2.9, 9.2, 9.3, 9.4, 9.5, 9.6
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
  ) { }

  async execute(dto: SendNotificationDto): Promise<void> {
    // 1. Resolve notification type by name
    const notificationType = await this.repository.findNotificationTypeByName(
      dto.notificationTypeName,
    );

    if (!notificationType) {
      this.logger.warn(`Notification type not found: ${dto.notificationTypeName}`);
      return;
    }

    const eventData = dto.data ?? {};

    // 2. Build notification content
    const { title, message } = buildNotificationContent(dto.notificationTypeName, eventData);

    // 3. Always create in-app notification (Req 2.8)
    await this.repository.createInAppNotification({
      userId: dto.userId,
      notificationTypeId: notificationType.id,
      title,
      message,
      eventSource: dto.eventSource,
      data: eventData,
    });

    // 4. Query active external preferences (Req 2.9)
    const activePreferences = await this.repository.findActiveExternalPreferences(
      dto.userId,
      notificationType.id,
    );

    // 5. For each active preference, send via external channel with retry/backoff
    for (const pref of activePreferences) {
      await this.sendViaExternalChannel(dto, notificationType, pref.channel, eventData);
    }
  }

  private async sendViaExternalChannel(
    dto: SendNotificationDto,
    notificationType: { id: string; name: string },
    channel: NotificationChannel,
    eventData: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      userId: dto.userId,
      channel,
      eventSource: dto.eventSource,
      data: eventData,
    };

    let sent = false;
    let lastError: unknown;

    // Retry up to MAX_RETRIES with exponential backoff (Req 9.3)
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Notification retry ${attempt}/${MAX_RETRIES} for user ${dto.userId} channel ${channel} — waiting ${delay}ms`,
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
          `Notification attempt ${attempt + 1} failed for user ${dto.userId} channel ${channel}: ${err instanceof Error ? err.message : String(err)}`,
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
      payload: eventData,
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
