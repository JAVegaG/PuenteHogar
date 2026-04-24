import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { InAppNotificationDto } from '../dtos/in-app-notification.dto';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

@Injectable()
export class GetNotificationsUseCase {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly repository: INotificationRepository,
    ) { }

    async execute(userId: string): Promise<InAppNotificationDto[]> {
        const [notifications, notificationTypes] = await Promise.all([
            this.repository.findInAppNotificationsByUserId(userId),
            this.repository.findAllNotificationTypes(),
        ]);

        const typeNameMap = new Map(
            notificationTypes.map((t) => [t.id, t.name]),
        );

        return notifications.map((n) => {
            const dto = new InAppNotificationDto();
            dto.id = n.id;
            dto.notificationType = typeNameMap.get(n.notificationTypeId) ?? n.notificationTypeId;
            dto.title = n.title;
            dto.message = n.message;
            dto.read = n.read;
            dto.eventSource = n.eventSource;
            dto.data = n.data;
            dto.createdAt = n.createdAt.toISOString();
            return dto;
        });
    }
}
