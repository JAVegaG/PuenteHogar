import { ApiProperty } from '@nestjs/swagger';

export class RoleChangeResponseDto {
    @ApiProperty({ description: 'Nuevo JWT de acceso con roles actualizados' })
    accessToken!: string;

    @ApiProperty({ type: [String], description: 'Lista de roles actualizados del usuario' })
    roles!: string[];
}
