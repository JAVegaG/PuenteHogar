import { ApiProperty } from '@nestjs/swagger';

export class PaymentHistoryItemDto {
    @ApiProperty({ description: 'ID del pago programado' })
    id!: string;

    @ApiProperty({ description: 'Etiqueta del mes (e.g., "Julio 2025")', example: 'Julio 2025' })
    monthLabel!: string;

    @ApiProperty({ description: 'Fecha de vencimiento del pago' })
    dueDate!: Date;

    @ApiProperty({ description: 'Monto del pago', example: 1200000 })
    amount!: number;

    @ApiProperty({ description: 'Moneda del pago', example: 'COP' })
    currency!: string;

    @ApiProperty({ description: 'Estado del pago', enum: ['PENDING', 'PAID', 'OVERDUE'] })
    status!: string;
}

export class PaginatedPaymentHistoryDto {
    @ApiProperty({ type: [PaymentHistoryItemDto], description: 'Lista de pagos' })
    items!: PaymentHistoryItemDto[];

    @ApiProperty({ description: 'Total de registros', example: 12 })
    total!: number;

    @ApiProperty({ description: 'Página actual', example: 1 })
    page!: number;

    @ApiProperty({ description: 'Cantidad por página', example: 10 })
    limit!: number;
}
