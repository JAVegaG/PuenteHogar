import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
    @ApiProperty({ description: 'ID del lease al que pertenece el contrato' })
    @IsString()
    @IsNotEmpty()
    leaseId!: string;

    @ApiProperty({ example: '2025-01-01', description: 'Fecha de inicio del contrato (ISO 8601)' })
    @IsDateString()
    startDate!: string;

    @ApiPropertyOptional({ example: '2026-01-01', description: 'Fecha de fin del contrato (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}
