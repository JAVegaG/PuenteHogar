import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import type { IListingRepository, ListingFilters } from '@modules/property-listings/domain/ports/listing-repository.port';
import { LISTING_CACHE, LISTING_REPOSITORY } from '@modules/property-listings/application/use-cases/create-listing.use-case';
import { ListingFiltersDto } from '@modules/property-listings/application/dtos/listing-filters.dto';
import { ListingResponseDto } from '@modules/property-listings/application/dtos/listing-response.dto';
import { PaginatedListingsResponseDto } from '@modules/property-listings/application/dtos/paginated-listings-response.dto';

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class SearchListingsUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly repository: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly cache: IListingCache,
  ) { }

  async execute(filters: ListingFiltersDto): Promise<PaginatedListingsResponseDto> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 9;

    // Parse additionalFeatures JSON string into Record<string, string>
    let parsedAdditionalFeatures: Record<string, string> | undefined;
    if (filters.additionalFeatures) {
      try {
        const parsed = JSON.parse(filters.additionalFeatures);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          parsedAdditionalFeatures = parsed as Record<string, string>;
        } else {
          throw new Error('Not a valid object');
        }
      } catch {
        throw new BadRequestException(
          'El parámetro additionalFeatures debe ser un JSON válido con formato Record<string, string>',
        );
      }
    }

    // Build ListingFilters with parsed additionalFeatures
    const repoFilters: ListingFilters = {
      department: filters.department,
      city: filters.city,
      neighborhood: filters.neighborhood,
      search: filters.search,
      propertyType: filters.propertyType,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      rooms: filters.rooms,
      bathrooms: filters.bathrooms,
      areaMin: filters.areaMin,
      areaMax: filters.areaMax,
      additionalFeatures: parsedAdditionalFeatures,
      publishedWithin: filters.publishedWithin,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: filters.page,
      pageSize: filters.pageSize,
    };

    const cacheKey = 'listings:published:' + JSON.stringify(repoFilters);

    const cached = await this.cache.getListings(cacheKey);
    if (cached) {
      const result = new PaginatedListingsResponseDto();
      result.data = cached.map((l) => this.toResponseDto(l));
      result.total = cached.length;
      result.page = page;
      result.pageSize = pageSize;
      return result;
    }

    const { data, total } = await this.repository.findPublished(repoFilters);
    // Req 3.4, 3.8: only listings with at least one photo
    const withPhotos = data.filter((l) => l.photos.length > 0);
    await this.cache.setListings(cacheKey, withPhotos, CACHE_TTL_SECONDS);

    const result = new PaginatedListingsResponseDto();
    result.data = withPhotos.map((l) => this.toResponseDto(l));
    result.total = total;
    result.page = page;
    result.pageSize = pageSize;
    return result;
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
    dto.numberOfRooms = entity.numberOfRooms;
    dto.numberOfBathrooms = entity.numberOfBathrooms;
    dto.propertyType = entity.propertyType;
    dto.neighborhood = entity.neighborhood;
    return dto;
  }
}
