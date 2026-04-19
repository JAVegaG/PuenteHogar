import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaseDetailTenantDto {
    @ApiProperty({ description: 'Tenant full name' })
    fullName!: string;

    @ApiProperty({ description: 'Document type code (e.g. CC, NIT)' })
    documentTypeCode!: string;

    @ApiProperty({ description: 'Document number' })
    documentNumber!: string;

    @ApiProperty({ description: 'Tenant email' })
    email!: string;

    @ApiProperty({ description: 'Tenant phone number' })
    phoneNumber!: string;
}

export class LeaseDetailPropertyDto {
    @ApiProperty({ description: 'Property type' })
    propertyType!: string;

    @ApiProperty({ description: 'Number of rooms' })
    numberOfRooms!: number;

    @ApiProperty({ description: 'Number of bathrooms' })
    numberOfBathrooms!: number;

    @ApiPropertyOptional({ description: 'Property area in m²', nullable: true })
    area!: number | null;

    @ApiProperty({ description: 'Full address' })
    address!: string;
}

export class LeaseDetailDto {
    @ApiProperty({ description: 'Lease ID' })
    id!: string;

    @ApiProperty({ description: 'Portfolio unit ID' })
    portfolioUnitId!: string;

    @ApiProperty({ description: 'Tenant user ID' })
    userId!: string;

    @ApiProperty({ description: 'Lease start date' })
    startDate!: string;

    @ApiPropertyOptional({ description: 'Lease end date', nullable: true })
    endDate!: string | null;

    @ApiProperty({ description: 'Lease status', enum: ['Vigente', 'Acordado', 'Finalizado'] })
    status!: string;

    @ApiProperty({ description: 'Monthly lease amount' })
    monthlyAmount!: number;

    @ApiPropertyOptional({ description: 'Associated contract ID', nullable: true })
    contractId!: string | null;

    @ApiPropertyOptional({ description: 'Contract status', nullable: true })
    contractStatus!: string | null;

    @ApiProperty({ type: () => LeaseDetailTenantDto, description: 'Tenant information' })
    tenant!: LeaseDetailTenantDto;

    @ApiProperty({ type: () => LeaseDetailPropertyDto, description: 'Property information' })
    property!: LeaseDetailPropertyDto;
}
