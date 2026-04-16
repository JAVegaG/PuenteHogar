import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListingPhotoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty()
  isMain!: boolean;
}

export class ListingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  portfolioUnitId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  listingDate!: Date;

  @ApiProperty()
  price!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [ListingPhotoDto] })
  photos!: ListingPhotoDto[];

  @ApiPropertyOptional({ nullable: true })
  numberOfRooms!: number | null;

  @ApiPropertyOptional({ nullable: true })
  numberOfBathrooms!: number | null;

  @ApiPropertyOptional({ nullable: true })
  propertyType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  neighborhood!: string | null;
}
