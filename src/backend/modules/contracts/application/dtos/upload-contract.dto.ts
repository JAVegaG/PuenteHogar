import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadContractDto {
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

  @ApiProperty({ example: 'https://storage.example.com/contrato.pdf', description: 'URL del archivo PDF en object storage' })
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional({ example: 2048000, description: 'Tamaño del archivo en bytes (máx 10 MB)' })
  @IsOptional()
  @IsNumber()
  fileSizeBytes?: number;

  @ApiPropertyOptional({ example: 'application/pdf', description: 'MIME type del archivo' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
