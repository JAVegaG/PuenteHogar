import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AggregatedReportResponseDto {
  @ApiProperty()
  portfolioId!: string;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty()
  numberOfUnits!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  avgAmount!: number;

  @ApiProperty()
  paymentCount!: number;

  @ApiProperty()
  minAmount!: number;

  @ApiProperty()
  maxAmount!: number;

  @ApiProperty()
  expectedAmount!: number;

  @ApiProperty()
  overdueCount!: number;

  @ApiPropertyOptional({ description: 'Mensaje informativo cuando no hay pagos en el periodo' })
  message?: string;
}
