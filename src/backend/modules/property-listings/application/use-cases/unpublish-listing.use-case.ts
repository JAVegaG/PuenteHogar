import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IListingCache } from '../../domain/ports/listing-cache.port';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import  { LISTING_CACHE, LISTING_REPOSITORY } from '@modules/property-listings/application/use-cases/create-listing.use-case';

@Injectable()
export class UnpublishListingUseCase {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly repository: IListingRepository,
    @Inject(LISTING_CACHE)
    private readonly cache: IListingCache,
  ) {}

  async execute(listingId: string, userId: string): Promise<void> {
    const ownerUserId = await this.repository.getOwnerUserId(listingId);

    if (ownerUserId === null) {
      throw new NotFoundException('Publicación no encontrada');
    }

    if (ownerUserId !== userId) {
      throw new ForbiddenException('Acceso denegado');
    }

    await this.repository.unpublish(listingId);
    // Req 3.11: invalidate all published listing cache keys (includes filter variants)
    await this.cache.invalidateByPattern('listings:published*');
  }
}
