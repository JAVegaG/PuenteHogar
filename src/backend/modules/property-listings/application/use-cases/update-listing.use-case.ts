import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IObjectStorage } from '@modules/property-listings/domain/ports/object-storage.port';
import { UpdateListingDto } from '@modules/property-listings/application/dtos/update-listing.dto';
import { ListingResponseDto } from '@modules/property-listings/application/dtos/listing-response.dto';
import {
    LISTING_REPOSITORY,
    LISTING_CACHE,
    OBJECT_STORAGE,
    UploadedFile,
} from './create-listing.use-case';

const MAX_PHOTOS = 10;

@Injectable()
export class UpdateListingUseCase {
    constructor(
        @Inject(LISTING_REPOSITORY)
        private readonly repository: IListingRepository,
        @Inject(LISTING_CACHE)
        private readonly cache: IListingCache,
        @Inject(OBJECT_STORAGE)
        private readonly objectStorage: IObjectStorage,
    ) { }

    async execute(
        listingId: string,
        dto: UpdateListingDto,
        userId: string,
        files?: UploadedFile[],
    ): Promise<ListingResponseDto> {
        const ownerUserId = await this.repository.getOwnerUserId(listingId);

        if (!ownerUserId) {
            throw new NotFoundException('Publicación no encontrada');
        }

        if (ownerUserId !== userId) {
            throw new ForbiddenException('Acceso denegado');
        }

        const existing = await this.repository.findById(listingId);

        if (!existing || !existing.isActive) {
            throw new NotFoundException('Publicación no encontrada o no está activa');
        }

        const removedCount = dto.removePhotoIds?.length ?? 0;
        const newFileCount = files?.length ?? 0;
        const newUrlCount = dto.photoUrls?.length ?? 0;
        const totalPhotos =
            existing.photos.length - removedCount + newFileCount + newUrlCount;

        if (totalPhotos > MAX_PHOTOS) {
            throw new BadRequestException(
                `El total de fotos no puede exceder ${MAX_PHOTOS}. Actualmente hay ${existing.photos.length}, se eliminan ${removedCount} y se agregan ${newFileCount + newUrlCount}.`,
            );
        }

        let newPhotoUrls: string[] = dto.photoUrls ?? [];

        if (files && files.length > 0) {
            const uploaded = await Promise.all(
                files.map((f) =>
                    this.objectStorage.uploadPhoto(f.buffer, f.originalname, f.mimetype),
                ),
            );
            newPhotoUrls = [...uploaded, ...newPhotoUrls];
        }

        const updated = await this.repository.update(listingId, {
            title: dto.title,
            description: dto.description,
            price: dto.price,
            newPhotoUrls: newPhotoUrls.length > 0 ? newPhotoUrls : undefined,
            removePhotoIds: dto.removePhotoIds,
        });

        await this.cache.invalidateByPattern('listings:published*');

        return this.toResponseDto(updated);
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
