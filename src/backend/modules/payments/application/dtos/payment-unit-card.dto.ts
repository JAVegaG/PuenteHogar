import { ApiProperty } from '@nestjs/swagger';

export class PaymentUnitCardDto {
    @ApiProperty({ description: 'ID de la unidad del portafolio' })
    unitId!: string;

    @ApiProperty({ description: 'Nombre/tipo de la propiedad', example: 'Apartamento Centro' })
    propertyName!: string;

    @ApiProperty({ description: 'Tipo de propiedad', example: 'Apartamento' })
    propertyType!: string;

    @ApiProperty({ description: 'Barrio de la propiedad', example: 'Centro' })
    neighborhood!: string;

    @ApiProperty({ description: 'Estado del arriendo', example: 'Vigente' })
    leaseStatus!: string;

    @ApiProperty({ description: 'Cantidad de pagos pendientes', example: 3 })
    pendingCount!: number;
}
