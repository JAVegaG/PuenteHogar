import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { ListingEntity } from '@modules/property-listings/domain/entities/listing.entity';
import { PhotoEntity } from '@modules/property-listings/domain/entities/photo.entity';
import {
  CreateListingData,
  type IListingRepository,
  ListingDetail,
  ListingFilters,
  PaginatedListings,
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

  async findPublished(filters: ListingFilters): Promise<PaginatedListings> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 9;

    // --- Step 1: Resolve property-level filters via cross-schema lookups ---
    // Determine which portfolio_unit_ids satisfy property/address filters
    let constrainedUnitIds: string[] | null = null; // null = no property-level constraint
    const hasPropertyFilter =
      filters.city ||
      filters.neighborhood ||
      filters.propertyType ||
      filters.rooms !== undefined ||
      filters.bathrooms !== undefined ||
      filters.areaMin !== undefined ||
      filters.areaMax !== undefined;

    if (hasPropertyFilter) {
      // Start from Address if city/neighborhood filters exist
      let propertyIds: string[] | null = null;

      if (filters.city || filters.neighborhood) {
        const addresses = await this.prisma.address.findMany({
          where: {
            ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' as const } }),
            ...(filters.neighborhood && { neighborhood: { contains: filters.neighborhood, mode: 'insensitive' as const } }),
          },
          select: { property_id: true },
        });
        propertyIds = addresses.map((a) => a.property_id);
        if (propertyIds.length === 0) return { data: [], total: 0 };
      }

      // Filter properties by type, rooms, bathrooms, area
      const propertyWhere: Record<string, unknown> = {};
      if (propertyIds) propertyWhere.id = { in: propertyIds };
      if (filters.propertyType) propertyWhere.property_type = filters.propertyType;
      if (filters.rooms !== undefined) propertyWhere.number_of_rooms = filters.rooms;
      if (filters.bathrooms !== undefined) propertyWhere.number_of_bathrooms = filters.bathrooms;

      const properties = await this.prisma.property.findMany({
        where: propertyWhere,
        select: { id: true, length: true, width: true },
      });

      // Apply area filter in memory (area = length × width)
      let filteredPropertyIds = properties
        .filter((p) => {
          if (filters.areaMin !== undefined || filters.areaMax !== undefined) {
            if (p.length === null || p.width === null) return false;
            const area = Number(p.length) * Number(p.width);
            if (filters.areaMin !== undefined && area < filters.areaMin) return false;
            if (filters.areaMax !== undefined && area > filters.areaMax) return false;
          }
          return true;
        })
        .map((p) => p.id);

      if (filteredPropertyIds.length === 0) return { data: [], total: 0 };

      // Resolve PortfolioUnit IDs from the filtered properties
      const units = await this.prisma.portfolioUnit.findMany({
        where: { property_id: { in: filteredPropertyIds } },
        select: { id: true },
      });

      constrainedUnitIds = units.map((u) => u.id);
      if (constrainedUnitIds.length === 0) return { data: [], total: 0 };
    }

    // --- Step 2: Build Listing query with remaining filters ---
    const listingWhere: Record<string, unknown> = { is_active: true };

    if (constrainedUnitIds) {
      listingWhere.portfolio_unit_id = { in: constrainedUnitIds };
    }

    // Price filters
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (filters.priceMin !== undefined) priceFilter.gte = filters.priceMin;
      if (filters.priceMax !== undefined) priceFilter.lte = filters.priceMax;
      listingWhere.price = priceFilter;
    }

    // publishedWithin filter
    if (filters.publishedWithin && filters.publishedWithin !== 'any') {
      const now = new Date();
      const thresholds: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
      };
      const ms = thresholds[filters.publishedWithin];
      if (ms) {
        listingWhere.listing_date = { gte: new Date(now.getTime() - ms) };
      }
    }

    // --- Step 3: Get total count ---
    const total = await this.prisma.listing.count({ where: listingWhere });

    if (total === 0) return { data: [], total: 0 };

    // --- Step 4: Sorting ---
    const orderBy: Record<string, string> = {};
    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'desc';
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else {
      orderBy.listing_date = sortOrder;
    }

    // --- Step 5: Paginated query ---
    const skip = (page - 1) * pageSize;
    const listings = await this.prisma.listing.findMany({
      where: listingWhere,
      include: { photos: true },
      orderBy,
      skip,
      take: pageSize,
    });

    // --- Step 6: Enrich each listing with Property + Address data ---
    const unitIds = [...new Set(listings.map((l) => l.portfolio_unit_id))];
    const units = await this.prisma.portfolioUnit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, property_id: true },
    });
    const unitToPropertyId = new Map(units.map((u) => [u.id, u.property_id]));

    const propertyIds = [...new Set(units.map((u) => u.property_id))];
    const propertiesWithAddr = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      include: { address: true },
    });
    const propertyMap = new Map(propertiesWithAddr.map((p) => [p.id, p]));

    const enrichedListings = listings.map((listing) => {
      const propertyId = unitToPropertyId.get(listing.portfolio_unit_id);
      const property = propertyId ? propertyMap.get(propertyId) : undefined;

      return this.toEntity(
        listing,
        property?.number_of_rooms ?? null,
        property?.number_of_bathrooms ?? null,
        property?.property_type ?? null,
        property?.address?.neighborhood ?? null,
      );
    });

    return { data: enrichedListings, total };
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
    numberOfRooms: number | null = null,
    numberOfBathrooms: number | null = null,
    propertyType: string | null = null,
    neighborhood: string | null = null,
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
      numberOfRooms,
      numberOfBathrooms,
      propertyType,
      neighborhood,
    );
  }
}
