import { Inject, Injectable } from '@nestjs/common';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import { LISTING_CACHE, LISTING_REPOSITORY } from '@modules/property-listings/application/use-cases/create-listing.use-case';
import { ListingFiltersDto } from '@modules/property-listings/application/dtos/listing-filters.dto';
import { ListingResponseDto } from '@modules/property-listings/application/dtos/listing-response.dto';

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class SearchListingsUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly repository: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly cache: IListingCache,
  ) {}

  async execute(filters: ListingFiltersDto): Promise<ListingResponseDto[]> {
    const cacheKey = 'listings:published:' + JSON.stringify(filters);

    const cached = await this.cache.getListings(cacheKey);
    if (cached) {
      return cached.map((l) => this.toResponseDto(l));
    }

    const listings = await this.repository.findPublished(filters);
    // Req 3.4, 3.8: only listings with at least one photo
    const withPhotos = listings.filter((l) => l.photos.length > 0);
    await this.cache.setListings(cacheKey, withPhotos, CACHE_TTL_SECONDS);

    return withPhotos.map((l) => this.toResponseDto(l));
  }

  private toResponseDto(entity: ListingEntity): ListingResponseDto {
    const dto = new ListingResponseDto();
    dto.id = entity.id;
    dto.portfolioUnitId = entity.portfolioUnitId;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.listingDate = entity.listingDate;
    dto.price = entity.price;
    dto.currency = entity.currency;
    dto.isActive = entity.isActive;
    dto.photos = entity.photos.map((p) => ({
      id: p.id,
      fileUrl: p.fileUrl,
      isMain: p.isMain,
    }));
    return dto;
  }
}
