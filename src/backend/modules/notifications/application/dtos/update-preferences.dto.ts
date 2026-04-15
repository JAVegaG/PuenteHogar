import { IsString, IsNotEmpty, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { NotificationChannel } from '../../domain/entities/notification-preference.entity';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ description: 'Nombre del tipo de notificación' })
  @IsString()
  @IsNotEmpty()
  notificationTypeName!: string;

  @ApiProperty({ enum: ['EMAIL', 'WHATSAPP'], description: 'Canal de notificación' })
  @IsIn(['EMAIL', 'WHATSAPP'])
  channel!: NotificationChannel;

  @ApiProperty({ description: 'Activar o desactivar este canal para este tipo de notificación' })
  @IsBoolean()
  isActive!: boolean;
}
