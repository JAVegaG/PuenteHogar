import { ApiProperty } from '@nestjs/swagger';

export class RemovableRoleDto {
    @ApiProperty({ description: 'Nombre del rol' })
    roleName!: string;

    @ApiProperty({ description: 'Indica si el rol puede ser eliminado' })
    removable!: boolean;

    @ApiProperty({ type: [String], description: 'Razones por las que el rol no puede ser eliminado' })
    reasons!: string[];
}
