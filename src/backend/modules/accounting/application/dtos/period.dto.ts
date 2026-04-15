import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PeriodDto {
  @ApiProperty({ example: 2025, description: 'Año del periodo', minimum: 2020, maximum: 2100 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 6, description: 'Mes del periodo (1-12)', minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
