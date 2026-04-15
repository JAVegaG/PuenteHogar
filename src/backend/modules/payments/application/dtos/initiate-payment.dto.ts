import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'ID del pago programado a procesar' })
  @IsString()
  @IsNotEmpty()
  scheduledPaymentId!: string;
}
