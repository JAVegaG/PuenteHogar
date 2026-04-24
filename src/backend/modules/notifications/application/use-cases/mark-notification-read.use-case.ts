import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { InAppNotificationDto } from '../dtos/in-app-notification.dto';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

@Injectable()
export class MarkNotificationReadUseCase {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly repository: INotificationRepository,
    ) { }

    async execute(id: string, userId: string): Promise<InAppNotificationDto> {
        const notification = await this.repository.markAsRead(id, userId);

        if (!notification) {
            throw new NotFoundException('Notificación no encontrada');
        }

        const notificationTypes = await this.repository.findAllNotificationTypes();
        const typeNameMap = new Map(
            notificationTypes.map((t) => [t.id, t.name]),
        );

        const dto = new InAppNotificationDto();
        dto.id = notification.id;
        dto.notificationType = typeNameMap.get(notification.notificationTypeId) ?? notification.notificationTypeId;
        dto.title = notification.title;
        dto.message = notification.message;
        dto.read = notification.read;
        dto.eventSource = notification.eventSource;
        dto.data = notification.data;
        dto.createdAt = notification.createdAt.toISOString();
        return dto;
    }
}
