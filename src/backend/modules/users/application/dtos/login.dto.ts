import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@ejemplo.com', description: 'Correo electrónico registrado' })
  @IsEmail()
  mail!: string;

  @ApiProperty({ example: 'contraseña123', description: 'Contraseña (mínimo 8 caracteres)', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
