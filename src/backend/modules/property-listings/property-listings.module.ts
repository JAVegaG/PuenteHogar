import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { RedisService } from '@src/shared/redis/redis.service';
import { S3ClientFactory } from '@src/shared/s3';
import { PropertyListingsEtlService } from './infrastructure/etl/property-listings-etl.service';
import { CreateListingUseCase, LISTING_CACHE, LISTING_REPOSITORY, NOTIFICATION_PORT, OBJECT_STORAGE } from './application/use-cases/create-listing.use-case';
import { GetListingDetailUseCase } from './application/use-cases/get-listing-detail.use-case';
import { RegisterContactEventUseCase } from './application/use-cases/register-contact-event.use-case';
import { SearchListingsUseCase } from './application/use-cases/search-listings.use-case';
import { UnpublishListingUseCase } from './application/use-cases/unpublish-listing.use-case';
import { ObjectStorageAdapter } from './infrastructure/adapters/object-storage.adapter';
import { RedisListingCacheAdapter } from './infrastructure/adapters/redis-listing-cache.adapter';
import { PrismaListingRepository } from './infrastructure/repositories/prisma-listing.repository';
import { PropertyListingsController } from './property-listings.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PropertyListingsController],
  providers: [
    PrismaService,
    RedisService,
    S3ClientFactory,
    PropertyListingsEtlService,
    CreateListingUseCase,
    SearchListingsUseCase,
    GetListingDetailUseCase,
    UnpublishListingUseCase,
    RegisterContactEventUseCase,
    {
      provide: LISTING_REPOSITORY,
      useClass: PrismaListingRepository,
    },
    {
      provide: LISTING_CACHE,
      useClass: RedisListingCacheAdapter,
    },
    {
      provide: OBJECT_STORAGE,
      useClass: ObjectStorageAdapter,
    },
    {
      provide: NOTIFICATION_PORT,
      useValue: {
        notifyLandlordOfInterest: async () => {
          // stub — notifications module will handle this
        },
      },
    },
  ],
  exports: [
    CreateListingUseCase,
    SearchListingsUseCase,
    GetListingDetailUseCase,
    UnpublishListingUseCase,
    RegisterContactEventUseCase,
  ],
})
export class PropertyListingsModule { }
