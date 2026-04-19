import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrichedUnitResponseDto {
  @ApiProperty({ description: 'ID de la unidad (PortfolioUnit)' })
  id!: string;

  @ApiProperty({ description: 'ID del portafolio al que pertenece' })
  portfolioId!: string;

  @ApiProperty({ description: 'Nombre o identificación de la unidad' })
  name!: string;

  @ApiProperty({ description: 'Tipo de propiedad' })
  propertyType!: string;

  @ApiProperty({ description: 'Dirección de la unidad' })
  address!: string;

  @ApiPropertyOptional({ description: 'Área calculada (largo × ancho), null si no se proporcionaron ambos', nullable: true })
  area!: number | null;

  @ApiProperty({ description: 'Número de habitaciones' })
  numberOfRooms!: number;

  @ApiProperty({ description: 'Número de baños' })
  numberOfBathrooms!: number;

  @ApiPropertyOptional({ description: 'Descripción adicional de la unidad', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Canon base de arrendamiento' })
  leaseBaseAmount!: number;

  @ApiProperty({ description: 'Moneda del canon (ISO 4217)' })
  leaseBaseCurrency!: string;

  @ApiProperty({ description: 'Código DANE del departamento' })
  departmentCode!: string;

  @ApiProperty({ description: 'Código DANE de la ciudad' })
  cityCode!: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt!: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt!: Date;
}
