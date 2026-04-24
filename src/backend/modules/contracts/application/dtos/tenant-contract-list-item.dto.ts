import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantContractListItemDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    leaseId!: string;

    @ApiProperty({ example: 'PENDING' })
    status!: string;

    @ApiProperty()
    startDate!: Date;

    @ApiPropertyOptional({ nullable: true })
    endDate!: Date | null;

    @ApiProperty()
    unitName!: string;

    @ApiProperty()
    landlordName!: string;
}
