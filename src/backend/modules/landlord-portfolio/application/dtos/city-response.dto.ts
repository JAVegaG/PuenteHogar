import { ApiProperty } from '@nestjs/swagger';

export class CityResponseDto {
    @ApiProperty({ example: 'uuid-here' })
    id!: string;

    @ApiProperty({ example: '05001', description: 'Código DANE del municipio (5 dígitos)' })
    code!: string;

    @ApiProperty({ example: '05', description: 'Código del departamento al que pertenece' })
    departmentCode!: string;

    @ApiProperty({ example: 'MEDELLÍN' })
    name!: string;
}
