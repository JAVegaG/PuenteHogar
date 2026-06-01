import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentLineItemDto {
    @ApiProperty({ description: 'Concepto del ítem', example: 'Canon de arrendamiento' })
    concept!: string;

    @ApiProperty({ description: 'Monto del ítem', example: 1200000 })
    amount!: number;
}

export class PaymentDetailDto {
    @ApiProperty({ description: 'ID del pago programado' })
    id!: string;

    @ApiProperty({ description: 'Estado del pago', enum: ['PENDING', 'PAID', 'OVERDUE'] })
    status!: string;

    @ApiProperty({ description: 'Monto total del pago', example: 1200000 })
    amount!: number;

    @ApiProperty({ description: 'Moneda del pago', example: 'COP' })
    currency!: string;

    @ApiProperty({ description: 'Fecha de vencimiento del pago' })
    dueDate!: Date;

    @ApiProperty({ type: [PaymentLineItemDto], description: 'Desglose de ítems del pago' })
    lineItems!: PaymentLineItemDto[];

    @ApiProperty({ description: 'Indica si el pago está pendiente (true) o ya fue pagado (false)' })
    isPending!: boolean;

    @ApiPropertyOptional({ nullable: true, description: 'Fecha en que se realizó el pago (solo para pagos PAID)' })
    datePaid!: Date | null;

    @ApiPropertyOptional({ nullable: true, description: 'Método de pago utilizado (solo para pagos PAID)', example: 'PSE' })
    paymentMethod!: string | null;

    @ApiPropertyOptional({ nullable: true, description: 'URL del comprobante de pago (solo para pagos PAID)' })
    receiptUrl!: string | null;
}
