import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NaturalDetailsDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre(s)' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido(s)' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ example: 'Juancho', description: 'Nombre preferido para comunicaciones' })
  @IsOptional()
  @IsString()
  preferredName?: string;
}

export class LegalDetailsDto {
  @ApiProperty({ example: 'Inmobiliaria XYZ S.A.S.', description: 'Razón social' })
  @IsString()
  @IsNotEmpty()
  businessName!: string;
}

export class RegisterUserDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del usuario' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ enum: ['LANDLORD', 'TENANT'], description: 'Tipo de usuario en la plataforma' })
  @IsString()
  @IsNotEmpty()
  userType!: string;

  @ApiProperty({ example: 'CC', description: 'Código del tipo de documento del catálogo (CC, NIT, CE, PP, TI)' })
  @IsString()
  @IsNotEmpty()
  documentTypeCode!: string;

  @ApiProperty({ example: '1234567890', description: 'Número de documento de identidad' })
  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @ApiProperty({ example: 'usuario@ejemplo.com', description: 'Correo electrónico único' })
  @IsEmail()
  mail!: string;

  @ApiProperty({ example: '3001234567', description: 'Número de celular de 10 dígitos' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Ingresa un número de teléfono de 10 dígitos' })
  phoneNumber!: string;

  @ApiProperty({ example: 'contraseña123', description: 'Contraseña (mínimo 8 caracteres)', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: ['LANDLORD', 'TENANT'], description: 'Rol en la plataforma' })
  @IsIn(['LANDLORD', 'TENANT'])
  role!: 'LANDLORD' | 'TENANT';

  @ApiProperty({ enum: ['natural', 'legal'], description: 'Tipo de persona' })
  @IsIn(['natural', 'legal'])
  personType!: 'natural' | 'legal';

  @ApiPropertyOptional({ type: () => NaturalDetailsDto, description: 'Datos de persona natural (requerido si personType = natural)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NaturalDetailsDto)
  naturalDetails?: NaturalDetailsDto;

  @ApiPropertyOptional({ type: () => LegalDetailsDto, description: 'Datos de persona jurídica (requerido si personType = legal)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalDetailsDto)
  legalDetails?: LegalDetailsDto;
}
