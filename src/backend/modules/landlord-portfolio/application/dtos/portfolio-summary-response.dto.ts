import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioSummaryResponseDto {
  @ApiProperty({ description: 'ID del portafolio' })
  id!: string;

  @ApiProperty({ description: 'Nombre del portafolio' })
  name!: string;

  @ApiPropertyOptional({ description: 'Descripción del portafolio', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Fecha de creación del portafolio' })
  creationDate!: Date;

  @ApiProperty({ description: 'Cantidad total de unidades en el portafolio' })
  totalUnits!: number;

  @ApiProperty({ description: 'Cantidad de arriendos activos' })
  activeLeases!: number;

  @ApiProperty({ description: 'Porcentaje de ocupación (0-100)' })
  occupancyPercentage!: number;
}
