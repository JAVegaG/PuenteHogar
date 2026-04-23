import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LandlordContractListItemDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    unitName!: string;

    @ApiProperty()
    tenantName!: string;

    @ApiProperty({ example: 'PENDING' })
    status!: string;

    @ApiProperty()
    startDate!: Date;

    @ApiPropertyOptional({ nullable: true })
    endDate!: Date | null;
}
