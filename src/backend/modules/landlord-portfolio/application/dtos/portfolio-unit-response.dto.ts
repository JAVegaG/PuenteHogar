import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioUnitResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  portfolioId!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty({ description: 'Nombre o identificación de la unidad' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  conditions!: string | null;

  @ApiProperty()
  leaseBaseAmount!: number;

  @ApiProperty({ example: 'COP' })
  leaseBaseCurrency!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Tipo de propiedad (resuelto desde Property)' })
  propertyType?: string;

  @ApiPropertyOptional({ description: 'Dirección completa (resuelto desde Address)' })
  address?: string;

  @ApiPropertyOptional({ description: 'Número de habitaciones' })
  numberOfRooms?: number;

  @ApiPropertyOptional({ description: 'Número de baños' })
  numberOfBathrooms?: number;

  @ApiPropertyOptional({ description: 'Área en m² (largo × ancho)', nullable: true })
  area?: number | null;
}
