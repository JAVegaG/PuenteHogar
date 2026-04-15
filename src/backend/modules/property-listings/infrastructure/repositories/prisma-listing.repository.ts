import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import {
  CreateListingData,
  type IListingRepository,
  ListingDetail,
  ListingFilters,
} from '@modules/property-listings/domain/ports/listing-repository.port';

@Injectable()
export class PrismaListingRepository implements IListingRepository {
  private readonly logger = new Logger(PrismaListingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateListingData): Promise<ListingEntity> {
    const listing = await this.prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          portfolio_unit_id: data.portfolioUnitId,
          title: data.title,
          description: data.description ?? null,
          price: data.price,
          currency: data.currency,
          photos: {
            create: data.photoUrls.map((url, index) => ({
              file_url: url,
              is_main: index === 0,
            })),
          },
        },
        include: { photos: true },
      });
      return created;
    });

    return this.toEntity(listing);
  }

  async findPublished(filters: ListingFilters): Promise<ListingEntity[]> {
    const hasAddressFilter = filters.city || filters.neighborhood;

    if (hasAddressFilter) {
      // Two-step query: find matching property IDs via Address, then find PortfolioUnit IDs,
      // then filter listings by portfolio_unit_id
      const addresses = await this.prisma.address.findMany({
        where: {
          ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } }),
          ...(filters.neighborhood && { neighborhood: { contains: filters.neighborhood, mode: 'insensitive' } }),
        },
        select: { property_id: true },
      });

      const propertyIds = addresses.map((a) => a.property_id);

      if (propertyIds.length === 0) return [];

      // Find PortfolioUnits referencing those properties (cross-schema, no FK)
      const units = await this.prisma.portfolioUnit.findMany({
        where: { property_id: { in: propertyIds } },
        select: { id: true },
      });

      const unitIds = units.map((u) => u.id);
      if (unitIds.length === 0) return [];

      const listings = await this.prisma.listing.findMany({
        where: {
          is_active: true,
          portfolio_unit_id: { in: unitIds },
        },
        include: { photos: true },
      });

      return listings.map((l) => this.toEntity(l));
    }

    // No address filter — return all active listings
    const listings = await this.prisma.listing.findMany({
      where: { is_active: true },
      include: { photos: true },
    });

    return listings.map((l) => this.toEntity(l));
  }

  async findById(id: string): Promise<ListingEntity | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!listing) return null;
    return this.toEntity(listing);
  }

  async findDetailById(id: string): Promise<ListingDetail | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!listing) return null;

    // Resolve property and address via cross-schema multi-step query
    const unit = await this.prisma.portfolioUnit.findFirst({
      where: { id: listing.portfolio_unit_id },
      select: { property_id: true, portfolio_id: true },
    });

    let numberOfRooms: number | null = null;
    let numberOfBathrooms: number | null = null;
    let propertyType: string | null = null;
    let address: ListingDetail['address'] = null;
    let landlordUserId: string | null = null;

    if (unit) {
      const property = await this.prisma.property.findUnique({
        where: { id: unit.property_id },
        include: { address: true },
      });

      if (property) {
        numberOfRooms = property.number_of_rooms;
        numberOfBathrooms = property.number_of_bathrooms;
        propertyType = property.property_type;
        if (property.address) {
          address = {
            state: property.address.state,
            city: property.address.city,
            neighborhood: property.address.neighborhood,
            address: property.address.address,
          };
        }
      }

      const portfolio = await this.prisma.landlordPortfolio.findFirst({
        where: { id: unit.portfolio_id },
        select: { user_id: true },
      });
      landlordUserId = portfolio?.user_id ?? null;
    }

    return {
      listing: this.toEntity(listing),
      numberOfRooms,
      numberOfBathrooms,
      propertyType,
      address,
      landlordUserId,
    };
  }

  async unpublish(id: string): Promise<void> {
    await this.prisma.listing.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getOwnerUserId(listingId: string): Promise<string | null> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { portfolio_unit_id: true },
    });

    if (!listing) return null;

    const unit = await this.prisma.portfolioUnit.findFirst({
      where: { id: listing.portfolio_unit_id },
      select: { portfolio_id: true },
    });

    if (!unit) return null;

    const portfolio = await this.prisma.landlordPortfolio.findFirst({
      where: { id: unit.portfolio_id },
      select: { user_id: true },
    });

    return portfolio?.user_id ?? null;
  }

  async registerContactEvent(listingId: string, tenantUserId: string): Promise<void> {
    await this.prisma.propertyListingsRaw.create({
      data: {
        payload: {
          type: 'CONTACT_EVENT',
          listingId,
          tenantUserId,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  private toEntity(
    listing: {
      id: string;
      portfolio_unit_id: string;
      title: string;
      description: string | null;
      listing_date: Date;
      price: { toNumber(): number } | number;
      currency: string;
      is_active: boolean;
      photos: {
        id: string;
        listing_id: string;
        file_url: string;
        is_main: boolean;
      }[];
    },
  ): ListingEntity {
    const price =
      typeof listing.price === 'object' && 'toNumber' in listing.price
        ? listing.price.toNumber()
        : Number(listing.price);

    const photos = listing.photos.map(
      (p) => new PhotoEntity(p.id, p.listing_id, p.file_url, p.is_main),
    );

    return new ListingEntity(
      listing.id,
      listing.portfolio_unit_id,
      listing.title,
      listing.description,
      listing.listing_date,
      price,
      listing.currency,
      listing.is_active,
      photos,
    );
  }
}
