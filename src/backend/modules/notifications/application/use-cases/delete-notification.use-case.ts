import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

@Injectable()
export class DeleteNotificationUseCase {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly repository: INotificationRepository,
    ) { }

    async execute(notificationId: string, userId: string): Promise<void> {
        await this.repository.softDeleteNotification(notificationId, userId);
    }
}
