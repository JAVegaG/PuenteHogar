import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import { LISTING_REPOSITORY } from '@modules/property-listings/application/use-cases/create-listing.use-case';
import { ListingDetailResponseDto } from '@modules/property-listings/application/dtos/listing-detail-response.dto';

@Injectable()
export class GetListingDetailUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly repository: IListingRepository,
  ) {}

  async execute(listingId: string): Promise<ListingDetailResponseDto> {
    const detail = await this.repository.findDetailById(listingId);

    if (!detail || !detail.listing.isActive) {
      throw new NotFoundException('Publicación no encontrada');
    }

    const dto = new ListingDetailResponseDto();
    dto.id = detail.listing.id;
    dto.portfolioUnitId = detail.listing.portfolioUnitId;
    dto.title = detail.listing.title;
    dto.description = detail.listing.description;
    dto.listingDate = detail.listing.listingDate;
    dto.price = detail.listing.price;
    dto.currency = detail.listing.currency;
    dto.isActive = detail.listing.isActive;
    dto.photos = detail.listing.photos.map((p) => ({
      id: p.id,
      fileUrl: p.fileUrl,
      isMain: p.isMain,
    }));
    dto.numberOfRooms = detail.numberOfRooms;
    dto.numberOfBathrooms = detail.numberOfBathrooms;
    dto.propertyType = detail.propertyType;
    dto.address = detail.address;
    dto.landlordUserId = detail.landlordUserId;
    return dto;
  }
}
