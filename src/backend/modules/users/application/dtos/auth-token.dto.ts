import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenDto {
  @ApiProperty({ description: 'JWT de acceso' })
  accessToken!: string;

  @ApiProperty({ description: 'ID del usuario autenticado' })
  userId!: string;

  @ApiProperty({ description: 'Nombre para mostrar del usuario' })
  displayName!: string;

  @ApiProperty({ description: 'Roles asignados al usuario', example: ['LANDLORD'] })
  roles!: string[];
}
