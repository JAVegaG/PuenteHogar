import { ApiProperty } from '@nestjs/swagger';

export class DepartmentResponseDto {
    @ApiProperty({ example: 'uuid-here' })
    id!: string;

    @ApiProperty({ example: '05', description: 'Código DANE del departamento (2 dígitos)' })
    code!: string;

    @ApiProperty({ example: 'ANTIOQUIA' })
    name!: string;
}
