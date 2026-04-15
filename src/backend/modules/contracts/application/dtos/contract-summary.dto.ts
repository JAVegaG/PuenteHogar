import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContractPartyDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  role!: string;
}

export class ContractSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  leaseId!: string;

  @ApiProperty({ example: 'PENDING', description: 'Estado del contrato: PENDING | SIGNATURE_PENDING | SIGNED' })
  status!: string;

  @ApiProperty()
  startDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  endDate!: Date | null;

  @ApiPropertyOptional({ nullable: true, description: 'URL del PDF del contrato en object storage' })
  fileUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Fecha y hora de firma' })
  signedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, description: 'ID de transacción del proveedor de firma' })
  externalSigningId!: string | null;

  @ApiProperty({ type: [ContractPartyDto] })
  parties!: ContractPartyDto[];
}
