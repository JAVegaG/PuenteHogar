import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type{ IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import type{ INotificationPort } from '@modules/property-listings/domain/ports/notification.port';
import { LISTING_REPOSITORY, NOTIFICATION_PORT } from '@modules/property-listings/application/use-cases/create-listing.use-case';
import { ContactEventDto } from '@modules/property-listings/application/dtos/contact-event.dto';

@Injectable()
export class RegisterContactEventUseCase {
  private readonly logger = new Logger(RegisterContactEventUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly repository: IListingRepository,
    @Inject(NOTIFICATION_PORT)
    private readonly notificationPort: INotificationPort,
  ) {}

  async execute(
    dto: ContactEventDto,
    tenantUserId: string,
  ): Promise<{ message: string }> {
    const listing = await this.repository.findById(dto.listingId);

    if (!listing) {
      throw new NotFoundException('Publicación no encontrada');
    }

    await this.repository.registerContactEvent(dto.listingId, tenantUserId);

    const ownerUserId = await this.repository.getOwnerUserId(dto.listingId);
    if (ownerUserId) {
      // Fire and forget — do not await, do not throw on failure
      this.notificationPort
        .notifyLandlordOfInterest(ownerUserId, tenantUserId, dto.listingId)
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Notification failed for listing ${dto.listingId}: ${message}`);
        });
    }

    return { message: 'Solicitud de contacto registrada' };
  }
}
