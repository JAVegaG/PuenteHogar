import { IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePortfolioUnitDto {
  @ApiProperty({ description: 'ID del inmueble (cross-schema ref a property_listings)' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiPropertyOptional({ example: 'Sin mascotas, no fumadores', description: 'Condiciones especiales del arrendamiento' })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiProperty({ example: 1200000, description: 'Canon base de arrendamiento', minimum: 0 })
  @IsNumber()
  @Min(0)
  leaseBaseAmount!: number;

  @ApiPropertyOptional({ example: 'COP', description: 'Moneda del canon (3 caracteres ISO 4217)', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  leaseBaseCurrency?: string;
}
