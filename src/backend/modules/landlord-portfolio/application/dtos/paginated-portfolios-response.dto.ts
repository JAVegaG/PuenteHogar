import { ApiProperty } from '@nestjs/swagger';
import { PortfolioSummaryResponseDto } from './portfolio-summary-response.dto';

export class PaginatedPortfoliosResponseDto {
  @ApiProperty({ type: [PortfolioSummaryResponseDto], description: 'Lista de portafolios' })
  data!: PortfolioSummaryResponseDto[];

  @ApiProperty({ description: 'Total de portafolios del usuario' })
  total!: number;

  @ApiProperty({ description: 'Página actual' })
  page!: number;

  @ApiProperty({ description: 'Cantidad de resultados por página' })
  limit!: number;

  @ApiProperty({ description: 'Total de páginas disponibles' })
  totalPages!: number;

  @ApiProperty({ description: 'Total de unidades en todos los portafolios del usuario' })
  globalTotalUnits!: number;

  @ApiProperty({ description: 'Total de arriendos activos en todos los portafolios del usuario' })
  globalActiveLeases!: number;
}
