import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListingFiltersDto {
  @ApiPropertyOptional({ example: 'Cali', description: 'Filtrar por ciudad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'El Peñón', description: 'Filtrar por barrio o zona' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'apartamento', description: 'Búsqueda por texto libre en título o descripción' })
  @IsOptional()
  @IsString()
  search?: string;
}
