import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePortfolioDto {
    @ApiPropertyOptional({ example: 'Propiedades Centro', description: 'Nombre del portafolio' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ApiPropertyOptional({ example: 'Portafolio de propiedades en el centro', description: 'Descripción del portafolio' })
    @IsOptional()
    @IsString()
    description?: string;
}
