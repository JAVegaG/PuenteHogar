import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaseDto {
    @ApiProperty({ example: 'tenant@example.com', description: 'Email of the tenant' })
    @IsEmail()
    @IsNotEmpty()
    tenantEmail!: string;

    @ApiProperty({ example: '2025-07-01', description: 'Lease start date (YYYY-MM-DD)' })
    @IsString()
    @IsNotEmpty()
    startDate!: string;

    @ApiPropertyOptional({ example: '2026-07-01', description: 'Lease end date (YYYY-MM-DD), omit for open-ended' })
    @IsOptional()
    @IsString()
    endDate?: string;
}
