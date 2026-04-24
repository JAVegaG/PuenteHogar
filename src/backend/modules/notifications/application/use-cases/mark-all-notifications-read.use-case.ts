import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

@Injectable()
export class MarkAllNotificationsReadUseCase {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly repository: INotificationRepository,
    ) { }

    async execute(userId: string): Promise<{ updatedCount: number }> {
        const updatedCount = await this.repository.markAllAsRead(userId);
        return { updatedCount };
    }
}
