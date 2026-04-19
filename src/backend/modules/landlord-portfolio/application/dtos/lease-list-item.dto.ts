import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaseListItemDto {
    @ApiProperty({ description: 'Lease ID' })
    id!: string;

    @ApiProperty({ description: 'Tenant full name' })
    tenantName!: string;

    @ApiProperty({ description: 'Lease start date' })
    startDate!: string;

    @ApiPropertyOptional({ description: 'Lease end date (null if open-ended)', nullable: true })
    endDate!: string | null;

    @ApiProperty({ description: 'Monthly lease amount' })
    monthlyAmount!: number;

    @ApiProperty({ description: 'Lease status', enum: ['Vigente', 'Acordado', 'Finalizado'] })
    status!: string;

    @ApiPropertyOptional({ description: 'Associated contract ID', nullable: true })
    contractId!: string | null;

    @ApiPropertyOptional({ description: 'Contract status', enum: ['PENDING', 'SIGNATURE_PENDING', 'SIGNED'], nullable: true })
    contractStatus!: string | null;
}
