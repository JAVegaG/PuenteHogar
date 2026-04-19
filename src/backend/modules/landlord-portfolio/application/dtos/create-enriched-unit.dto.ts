import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnrichedUnitDto {
  @ApiProperty({ example: 'Apartamento 301', description: 'Nombre o identificación de la unidad', minLength: 1, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ example: 'Carrera 7 #58-32', description: 'Dirección de la unidad', minLength: 1, maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 300)
  address!: string;

  @ApiProperty({ example: 'APARTAMENTO', description: 'Código del tipo de propiedad. Los valores válidos provienen del catálogo: GET /portfolio/property-types' })
  @IsString()
  @IsNotEmpty()
  propertyType!: string;

  @ApiPropertyOptional({ example: 10.5, description: 'Largo en metros (positivo)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  length?: number;

  @ApiPropertyOptional({ example: 8.0, description: 'Ancho en metros (positivo)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @ApiPropertyOptional({ example: 3, description: 'Número de habitaciones', default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfRooms?: number = 0;

  @ApiPropertyOptional({ example: 2, description: 'Número de baños', default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfBathrooms?: number = 0;

  @ApiPropertyOptional({ example: 'Unidad con vista al parque', description: 'Descripción adicional de la unidad' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1200000, description: 'Canon base de arrendamiento', minimum: 0 })
  @IsNumber()
  @Min(0)
  leaseBaseAmount!: number;

  @ApiPropertyOptional({ example: 'COP', description: 'Moneda del canon (3 caracteres ISO 4217)', default: 'COP', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  leaseBaseCurrency?: string = 'COP';

  @ApiProperty({ example: '05', description: 'Código DANE del departamento (2 dígitos). Consulte GET /portfolio/departments' })
  @IsString()
  @IsNotEmpty()
  departmentCode!: string;

  @ApiProperty({ example: '05001', description: 'Código DANE del municipio (5 dígitos). Consulte GET /portfolio/departments/:departmentCode/cities' })
  @IsString()
  @IsNotEmpty()
  cityCode!: string;
}
