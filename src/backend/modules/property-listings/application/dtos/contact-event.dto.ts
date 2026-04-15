import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactEventDto {
  @ApiProperty({ description: 'ID de la publicación de interés' })
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @ApiPropertyOptional({ example: '¿Está disponible para visita este fin de semana?', description: 'Mensaje opcional para el arrendador' })
  @IsOptional()
  @IsString()
  message?: string;
}
