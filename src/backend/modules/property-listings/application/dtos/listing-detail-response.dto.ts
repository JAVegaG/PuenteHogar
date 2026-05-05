import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingPhotoDto } from './listing-response.dto';

export class ListingAddressDto {
  @ApiProperty()
  state!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  neighborhood!: string;

  @ApiProperty()
  address!: string;
}

export class ListingDetailResponseDto {
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

  @ApiPropertyOptional({ type: () => ListingAddressDto, nullable: true })
  address!: ListingAddressDto | null;

  @ApiPropertyOptional({ nullable: true })
  area!: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'ID del arrendador para contacto' })
  landlordUserId!: string | null;
}
