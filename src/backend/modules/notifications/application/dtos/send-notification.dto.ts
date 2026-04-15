import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({ description: 'ID del usuario destinatario' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Nombre del tipo de notificación (ej: CONTRACT_SIGNED)' })
  @IsString()
  @IsNotEmpty()
  notificationTypeName!: string;

  @ApiProperty({ description: 'Evento que originó la notificación' })
  @IsString()
  @IsNotEmpty()
  eventSource!: string;

  @ApiProperty({ description: 'Datos adicionales del evento', required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
