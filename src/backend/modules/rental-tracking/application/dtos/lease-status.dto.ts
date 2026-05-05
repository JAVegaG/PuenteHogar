import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LeaseState } from '@modules/rental-tracking/domain/entities/lease-status.entity';

export class TransitionLeaseStateDto {
  @ApiPropertyOptional({ description: 'ID del lease a transicionar (opcional si se provee listingId)' })
  @ValidateIf((o) => !o.listingId)
  @IsString()
  @IsNotEmpty()
  leaseId?: string;

  @ApiPropertyOptional({ description: 'ID del listing (se resuelve al lease asociado)' })
  @IsOptional()
  @IsString()
  listingId?: string;

  @ApiProperty({
    enum: ['PUBLISHED', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED'],
    description: 'Nuevo estado del lease',
  })
  @IsEnum(['PUBLISHED', 'CONTACT_INITIATED', 'CONTRACT_UPLOADED', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED'])
  newState!: LeaseState;
}

export class LeaseStatusHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'CONTRACT_SIGNED' })
  state!: string;

  @ApiProperty()
  recordedAt!: Date;
}

export class LeaseStatusResponseDto {
  @ApiProperty()
  leaseId!: string;

  @ApiProperty({ example: 'CONTACT_INITIATED' })
  currentState!: string;

  @ApiProperty()
  lastChangedAt!: Date;

  @ApiProperty({ type: [LeaseStatusHistoryItemDto] })
  history!: LeaseStatusHistoryItemDto[];
}

export class ActiveLeaseSummaryDto {
  @ApiProperty()
  leaseId!: string;

  @ApiProperty()
  propertyName!: string;

  @ApiProperty({ example: 'PAYMENT_RECEIVED' })
  currentState!: string;

  @ApiProperty()
  lastChangedAt!: Date;
}
