import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';

interface PhotoPayload {
  fileUrl: string;
  isMain?: boolean;
  txHash?: string;
}

interface AdditionalFeaturePayload {
  additionalFeatureId: string;
  value?: string;
  order?: number;
}

interface PropertyListingsRawPayload {
  propertyType: string;
  length?: number;
  width?: number;
  numberOfBathrooms: number;
  numberOfRooms: number;
  address: {
    state: string;
    city: string;
    neighborhood: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  listing: {
    portfolioUnitId: string;
    title: string;
    description?: string;
    price: number;
    currency?: string;
  };
  photos: PhotoPayload[];
  additionalFeatures?: AdditionalFeaturePayload[];
}

@Injectable()
export class PropertyListingsEtlService {
  private readonly logger = new Logger(PropertyListingsEtlService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPropertyListingsRaw(): Promise<void> {
    const records = await this.prisma.propertyListingsRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL property-listings: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = record.payload as unknown as PropertyListingsRawPayload;
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          const property = await tx.property.create({
            data: {
              property_type: payload.propertyType,
              length: payload.length,
              width: payload.width,
              number_of_bathrooms: payload.numberOfBathrooms,
              number_of_rooms: payload.numberOfRooms,
            },
          });

          await tx.address.create({
            data: {
              property_id: property.id,
              state: payload.address.state,
              city: payload.address.city,
              neighborhood: payload.address.neighborhood,
              address: payload.address.address,
              latitude: payload.address.latitude,
              longitude: payload.address.longitude,
            },
          });

          const listing = await tx.listing.create({
            data: {
              portfolio_unit_id: payload.listing.portfolioUnitId,
              title: payload.listing.title,
              description: payload.listing.description,
              price: payload.listing.price,
              currency: payload.listing.currency ?? 'COP',
            },
          });

          for (const photo of payload.photos) {
            await tx.photo.create({
              data: {
                listing_id: listing.id,
                file_url: photo.fileUrl,
                is_main: photo.isMain ?? false,
                tx_hash: photo.txHash,
              },
            });
          }

          if (payload.additionalFeatures) {
            for (const feat of payload.additionalFeatures) {
              await tx.propertyAdditionalFeature.create({
                data: {
                  property_id: property.id,
                  additional_feature_id: feat.additionalFeatureId,
                  value: feat.value,
                  order: feat.order,
                },
              });
            }
          }

          await tx.propertyListingsRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL property-listings: error on record ${record.id}: ${reason}`);
        await this.prisma.propertyListingsRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL property-listings: finished processing batch`);
  }

  private validatePayload(payload: PropertyListingsRawPayload): void {
    if (!payload.propertyType) throw new Error('Missing field: propertyType');
    if (!payload.numberOfBathrooms) throw new Error('Missing field: numberOfBathrooms');
    if (!payload.numberOfRooms) throw new Error('Missing field: numberOfRooms');
    if (!payload.address) throw new Error('Missing field: address');
    if (!payload.listing) throw new Error('Missing field: listing');
    if (!payload.photos || payload.photos.length === 0) throw new Error('Missing field: photos');
  }
}
