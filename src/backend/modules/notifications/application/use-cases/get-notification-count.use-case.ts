import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import { NotificationCountDto } from '../dtos/notification-count.dto';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

@Injectable()
export class GetNotificationCountUseCase {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly repository: INotificationRepository,
    ) { }

    async execute(userId: string): Promise<NotificationCountDto> {
        const unreadCount = await this.repository.countUnreadByUserId(userId);
        const dto = new NotificationCountDto();
        dto.unreadCount = unreadCount;
        return dto;
    }
}
