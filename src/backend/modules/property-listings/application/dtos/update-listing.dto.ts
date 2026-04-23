import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateListingDto {
    @ApiPropertyOptional({ example: 'Apartamento renovado', description: 'Título de la publicación' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @ApiPropertyOptional({ example: 'Descripción actualizada', description: 'Descripción del inmueble' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 1500000, description: 'Canon de arrendamiento', minimum: 1 })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(1)
    price?: number;

    @ApiPropertyOptional({
        type: [String],
        description: 'URLs de fotos pre-suministradas',
        example: ['https://storage.example.com/photo1.jpg'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    photoUrls?: string[];

    @ApiPropertyOptional({
        type: [String],
        description: 'IDs de fotos a eliminar',
        example: ['photo-id-1', 'photo-id-2'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    removePhotoIds?: string[];
}
