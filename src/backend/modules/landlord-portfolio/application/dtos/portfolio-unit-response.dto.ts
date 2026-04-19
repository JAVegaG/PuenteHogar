import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioUnitResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  portfolioId!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty({ description: 'Nombre o identificación de la unidad' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  conditions!: string | null;

  @ApiProperty()
  leaseBaseAmount!: number;

  @ApiProperty({ example: 'COP' })
  leaseBaseCurrency!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
