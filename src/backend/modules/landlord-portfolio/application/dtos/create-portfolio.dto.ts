import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePortfolioDto {
  @ApiProperty({ example: 'Portafolio Centro', description: 'Nombre del portafolio', minLength: 1, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({ example: 'Propiedades en el centro de la ciudad', description: 'Descripción opcional del portafolio', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
