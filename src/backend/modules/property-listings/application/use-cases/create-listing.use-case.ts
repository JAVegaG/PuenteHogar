import {
  ForbiddenException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IObjectStorage } from '@modules/property-listings/domain/ports/object-storage.port';
import { CreateListingDto } from '@modules/property-listings/application/dtos/create-listing.dto';
import { ListingResponseDto } from '@modules/property-listings/application/dtos/listing-response.dto';

export const LISTING_REPOSITORY = 'LISTING_REPOSITORY';
export const LISTING_CACHE = 'LISTING_CACHE';
export const OBJECT_STORAGE = 'OBJECT_STORAGE';
export const NOTIFICATION_PORT = 'NOTIFICATION_PORT';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class CreateListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly repository: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly cache: IListingCache,
    @Inject(OBJECT_STORAGE)
    private readonly objectStorage: IObjectStorage,
  ) {}

  async execute(
    dto: CreateListingDto,
    userId: string,
    userRoles: string[],
    files?: UploadedFile[],
  ): Promise<ListingResponseDto> {
    if (!userRoles.includes('LANDLORD')) {
      throw new ForbiddenException('Acceso denegado');
    }

    // Req 3.2: reject if no photo provided (either uploaded files or pre-supplied URLs)
    const hasFiles = files && files.length > 0;
    const hasUrls = dto.photoUrls && dto.photoUrls.length > 0;

    if (!hasFiles && !hasUrls) {
      throw new UnprocessableEntityException('Se requiere al menos una fotografía');
    }

    // Req 3.3: upload files to object storage, persist only URLs
    let photoUrls: string[] = dto.photoUrls ?? [];
    if (hasFiles) {
      const uploaded = await Promise.all(
        files!.map((f) =>
          this.objectStorage.uploadPhoto(f.buffer, f.originalname, f.mimetype),
        ),
      );
      photoUrls = [...uploaded, ...photoUrls];
    }

    const listing = await this.repository.create({
      portfolioUnitId: dto.portfolioUnitId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      currency: dto.currency ?? 'COP',
      photoUrls,
    });

    // Invalidate all published listing cache keys
    await this.cache.invalidateByPattern('listings:published*');

    return this.toResponseDto(listing);
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
