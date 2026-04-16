import { ApiProperty } from '@nestjs/swagger';
import { ListingResponseDto } from './listing-response.dto';

export class PaginatedListingsResponseDto {
  @ApiProperty({ type: [ListingResponseDto] })
  data!: ListingResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 9 })
  pageSize!: number;
}
