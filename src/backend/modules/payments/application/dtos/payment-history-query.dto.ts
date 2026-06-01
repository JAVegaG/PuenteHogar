import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentHistoryQueryDto {
    @ApiPropertyOptional({
        description: 'Filtro por estado del pago',
        enum: ['ALL', 'PENDING', 'PAID', 'OVERDUE'],
        default: 'ALL',
    })
    @IsOptional()
    @IsIn(['ALL', 'PENDING', 'PAID', 'OVERDUE'])
    status?: 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE' = 'ALL';

    @ApiPropertyOptional({
        description: 'Número de página',
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Cantidad de resultados por página',
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
