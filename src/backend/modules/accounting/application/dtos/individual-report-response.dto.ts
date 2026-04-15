import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndividualReportResponseDto {
  @ApiProperty()
  portfolioUnitId!: string;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  minAmount!: number;

  @ApiProperty()
  maxAmount!: number;

  @ApiProperty()
  paymentCount!: number;

  @ApiProperty()
  expectedAmount!: number;

  @ApiProperty()
  overdueCount!: number;

  @ApiPropertyOptional({ description: 'Mensaje informativo cuando no hay pagos en el periodo' })
  message?: string;
}
