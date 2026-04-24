import { ApiProperty } from '@nestjs/swagger';

export class InAppNotificationDto {
    @ApiProperty() id!: string;
    @ApiProperty() notificationType!: string;
    @ApiProperty() title!: string;
    @ApiProperty() message!: string;
    @ApiProperty() read!: boolean;
    @ApiProperty() eventSource!: string;
    @ApiProperty() data!: Record<string, unknown>;
    @ApiProperty() createdAt!: string;
}
