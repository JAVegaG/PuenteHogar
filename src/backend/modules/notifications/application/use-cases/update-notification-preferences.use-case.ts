import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import type { UpdateNotificationPreferencesDto } from '../dtos/update-preferences.dto';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

/**
 * UpdateNotificationPreferencesUseCase
 *
 * Updates the user's notification preferences for a given type and channel.
 * Changes apply to future notifications only — already-enqueued notifications
 * are not affected (Req 9.6, 9.7).
 */
@Injectable()
export class UpdateNotificationPreferencesUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
  ) {}

  async execute(userId: string, dto: UpdateNotificationPreferencesDto): Promise<void> {
    const notificationType = await this.repository.findNotificationTypeByName(
      dto.notificationTypeName,
    );

    if (!notificationType) {
      throw new NotFoundException(
        `Tipo de notificación no encontrado: ${dto.notificationTypeName}`,
      );
    }

    await this.repository.upsertPreference(
      userId,
      notificationType.id,
      dto.channel,
      dto.isActive,
    );
  }
}
