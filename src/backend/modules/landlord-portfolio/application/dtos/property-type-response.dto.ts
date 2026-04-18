import { ApiProperty } from '@nestjs/swagger';

export class PropertyTypeResponseDto {
    @ApiProperty({ example: 'uuid-here' })
    id!: string;

    @ApiProperty({ example: 'APARTAMENTO' })
    code!: string;

    @ApiProperty({ example: 'Apartamento' })
    description!: string;
}
