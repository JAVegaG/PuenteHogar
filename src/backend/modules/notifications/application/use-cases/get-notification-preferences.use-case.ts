import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/ports/notification-repository.port';
import type { NotificationChannel } from '../../domain/entities/notification-preference.entity';
import { ChannelPreferenceDto, PreferencesGroupedDto } from '../dtos/preferences-grouped.dto';
import { NOTIFICATION_REPOSITORY } from './send-notification.use-case';

const EXTERNAL_CHANNELS: NotificationChannel[] = ['EMAIL', 'WHATSAPP'];

@Injectable()
export class GetNotificationPreferencesUseCase {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY)
        private readonly repository: INotificationRepository,
    ) { }

    async execute(userId: string): Promise<PreferencesGroupedDto[]> {
        const [notificationTypes, preferences] = await Promise.all([
            this.repository.findAllNotificationTypes(),
            this.repository.findPreferencesByUserId(userId),
        ]);

        const preferenceMap = new Map<string, boolean>();
        for (const pref of preferences) {
            preferenceMap.set(`${pref.notificationTypeId}:${pref.channel}`, pref.isActive);
        }

        return notificationTypes.map((type) => {
            const group = new PreferencesGroupedDto();
            group.notificationTypeName = type.name;
            group.channels = EXTERNAL_CHANNELS.map((channel) => {
                const dto = new ChannelPreferenceDto();
                dto.channel = channel;
                dto.isActive = preferenceMap.get(`${type.id}:${channel}`) ?? false;
                return dto;
            });
            return group;
        });
    }
}
