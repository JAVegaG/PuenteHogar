import {
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import { ListingResponseDto } from '@modules/property-listings/application/dtos/listing-response.dto';
import { LISTING_REPOSITORY } from './create-listing.use-case';

@Injectable()
export class FindListingByUnitUseCase {
    constructor(
        @Inject(LISTING_REPOSITORY)
        private readonly repository: IListingRepository,
    ) { }

    async execute(
        portfolioUnitId: string,
        userId: string,
    ): Promise<ListingResponseDto> {
        const ownerUserId =
            await this.repository.getOwnerUserIdByUnit(portfolioUnitId);

        if (!ownerUserId) {
            throw new NotFoundException('Unidad de portafolio no encontrada');
        }

        if (ownerUserId !== userId) {
            throw new ForbiddenException('Acceso denegado');
        }

        const listing =
            await this.repository.findActiveByPortfolioUnitId(portfolioUnitId);

        if (!listing) {
            throw new NotFoundException(
                'No hay publicación activa para esta unidad',
            );
        }

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
        dto.numberOfRooms = entity.numberOfRooms;
        dto.numberOfBathrooms = entity.numberOfBathrooms;
        dto.propertyType = entity.propertyType;
        dto.neighborhood = entity.neighborhood;
        return dto;
    }
}
