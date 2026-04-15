import { IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePortfolioUnitDto {
  @ApiPropertyOptional({ example: 'Sin mascotas', description: 'Condiciones especiales del arrendamiento' })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiPropertyOptional({ example: 1300000, description: 'Nuevo canon base', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  leaseBaseAmount?: number;

  @ApiPropertyOptional({ example: 'COP', description: 'Moneda del canon (3 caracteres ISO 4217)', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  leaseBaseCurrency?: string;
}
