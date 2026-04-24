import { ApiProperty } from '@nestjs/swagger';

export class ChannelPreferenceDto {
    @ApiProperty({ enum: ['EMAIL', 'WHATSAPP'] }) channel!: string;
    @ApiProperty() isActive!: boolean;
}

export class PreferencesGroupedDto {
    @ApiProperty() notificationTypeName!: string;
    @ApiProperty({ type: [ChannelPreferenceDto] }) channels!: ChannelPreferenceDto[];
}
