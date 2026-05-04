import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListingFiltersDto {
  @ApiPropertyOptional({ example: '76', description: 'Filtrar por departamento (código DANE)' })
  @IsOptional()
  @IsString()
  department?: string;

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

  @ApiPropertyOptional({
    example: 'APARTAMENTO',
    description: 'Filtrar por tipo de propiedad. Los valores válidos provienen del catálogo: GET /portfolio/property-types',
  })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ example: 500000, description: 'Precio mínimo' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMin?: number;

  @ApiPropertyOptional({ example: 3000000, description: 'Precio máximo' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMax?: number;

  @ApiPropertyOptional({ example: 2, description: 'Número de habitaciones' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  rooms?: number;

  @ApiPropertyOptional({ example: 1, description: 'Número de baños' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 30, description: 'Área mínima en m²' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaMin?: number;

  @ApiPropertyOptional({ example: 150, description: 'Área máxima en m²' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  areaMax?: number;

  @ApiPropertyOptional({
    example: '{"uuid-1":"piscina","uuid-2":"2"}',
    description: 'Características adicionales como JSON codificado (Record<string, string>)',
  })
  @IsOptional()
  @IsString()
  additionalFeatures?: string;

  @ApiPropertyOptional({ enum: ['24h', '7d', '30d', '90d', 'any'], description: 'Filtrar por antigüedad de publicación' })
  @IsOptional()
  @IsIn(['24h', '7d', '30d', '90d', 'any'])
  publishedWithin?: string;

  @ApiPropertyOptional({ enum: ['date', 'price'], default: 'date', description: 'Campo de ordenamiento' })
  @IsOptional()
  @IsIn(['date', 'price'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Dirección de ordenamiento' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Número de página' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 9, default: 9, description: 'Cantidad de resultados por página' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number;
}
