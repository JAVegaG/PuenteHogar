import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'ID del usuario' })
  id!: string;

  @ApiProperty({ description: 'Correo electrónico' })
  mail!: string;

  @ApiProperty({ description: 'Nombre para mostrar del usuario' })
  displayName!: string;

  @ApiProperty({ description: 'Roles asignados', example: ['TENANT'] })
  roles!: string[];

  @ApiProperty({ description: 'Indica si la cuenta está activa' })
  isActive!: boolean;
}
