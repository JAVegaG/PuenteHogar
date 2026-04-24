import { ApiProperty } from '@nestjs/swagger';

export class NotificationCountDto {
    @ApiProperty() unreadCount!: number;
}
