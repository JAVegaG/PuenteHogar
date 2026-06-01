import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NextPaymentDto {
    @ApiProperty({ description: 'Scheduled payment ID' })
    id!: string;

    @ApiProperty({ description: 'Payment amount' })
    amount!: number;

    @ApiProperty({ description: 'Payment due date' })
    dueDate!: Date;

    @ApiProperty({ description: 'Payment status (e.g. PENDING, OVERDUE)' })
    status!: string;
}

export class TenantLeaseDetailDto {
    @ApiProperty({ description: 'Lease ID' })
    leaseId!: string;

    @ApiProperty({ description: 'Portfolio unit ID — needed for navigation to payment flows' })
    unitId!: string;

    @ApiProperty({ description: 'Property type (e.g. Apartamento, Casa)' })
    propertyType!: string;

    @ApiProperty({ description: 'Neighborhood name' })
    neighborhood!: string;

    @ApiProperty({ description: 'Full property address' })
    address!: string;

    @ApiProperty({ description: 'Monthly lease amount (canon mensual)' })
    monthlyAmount!: number;

    @ApiProperty({ example: 'COP', description: 'Currency code' })
    currency!: string;

    @ApiProperty({ description: 'Lease status', enum: ['Vigente', 'Acordado', 'Finalizado'] })
    leaseStatus!: string;

    @ApiPropertyOptional({ type: () => NextPaymentDto, nullable: true, description: 'Next pending payment or null if all paid' })
    nextPayment!: NextPaymentDto | null;
}
