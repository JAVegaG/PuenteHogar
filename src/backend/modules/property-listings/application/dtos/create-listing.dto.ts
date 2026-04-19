import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ description: 'ID de la unidad de portafolio asociada' })
  @IsString()
  @IsNotEmpty()
  portfolioUnitId!: string;

  @ApiProperty({ example: 'Apartamento en el centro', description: 'Título de la publicación' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Amplio apartamento con vista al parque', description: 'Descripción del inmueble' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1200000, description: 'Canon de arrendamiento', minimum: 0 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'COP', description: 'Moneda (por defecto COP)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs de fotos (alternativa a subir archivos vía multipart). Se requiere al menos una foto.',
    example: ['https://storage.example.com/photo1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  photoUrls?: string[];
}
