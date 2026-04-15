import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SigningWebhookDto {
  @ApiProperty({ description: 'ID del contrato en la plataforma' })
  @IsString()
  @IsNotEmpty()
  contractId!: string;

  @ApiProperty({ description: 'ID de la sesión de firma en el proveedor externo' })
  @IsString()
  @IsNotEmpty()
  externalSigningId!: string;

  @ApiProperty({ enum: ['COMPLETED', 'FAILED'], description: 'Resultado del proceso de firma' })
  @IsIn(['COMPLETED', 'FAILED'])
  status!: 'COMPLETED' | 'FAILED';

  @ApiPropertyOptional({ description: 'Hash del documento firmado para verificación de integridad' })
  @IsOptional()
  @IsString()
  documentHash?: string;

  @ApiPropertyOptional({ example: '2025-06-01T10:00:00Z', description: 'Timestamp de completación (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
