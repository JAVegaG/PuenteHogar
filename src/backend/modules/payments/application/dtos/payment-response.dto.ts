import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  scheduledPaymentId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: 'PENDING', description: 'Estado: PENDING | PROCESSING | PAID | REJECTED' })
  status!: string;

  @ApiProperty()
  dueDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  paymentDesc!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdAt!: Date | null;
}
