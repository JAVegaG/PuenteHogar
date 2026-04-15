import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentWebhookDto {
  @ApiProperty({ description: 'ID del pago programado en la plataforma' })
  @IsString()
  @IsNotEmpty()
  scheduledPaymentId!: string;

  @ApiProperty({ description: 'ID de transacción en la pasarela de pagos' })
  @IsString()
  @IsNotEmpty()
  externalTransactionId!: string;

  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], description: 'Resultado del pago' })
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiProperty({ example: 1200000, description: 'Monto procesado' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'COP', description: 'Moneda del pago' })
  @IsString()
  currency!: string;
}
