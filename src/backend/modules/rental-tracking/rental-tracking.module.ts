import { Module } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { GetActiveLeasesSummaryUseCase } from './application/use-cases/get-active-leases-summary.use-case';
import { GetLeaseStatusUseCase } from './application/use-cases/get-lease-status.use-case';
import {
  TRACKING_NOTIFICATION_PORT,
  TRACKING_REPOSITORY,
  TransitionLeaseStateUseCase,
} from './application/use-cases/transition-lease-state.use-case';
import { RentalTrackingEtlService } from './infrastructure/etl/rental-tracking-etl.service';
import { PrismaTrackingRepository } from './infrastructure/repositories/prisma-tracking.repository';
import { RentalTrackingController } from './rental-tracking.controller';

@Module({
  controllers: [RentalTrackingController],
  providers: [
    PrismaService,
    RentalTrackingEtlService,
    TransitionLeaseStateUseCase,
    GetLeaseStatusUseCase,
    GetActiveLeasesSummaryUseCase,
    {
      provide: TRACKING_REPOSITORY,
      useClass: PrismaTrackingRepository,
    },
    {
      provide: TRACKING_NOTIFICATION_PORT,
      useValue: {
        notifyLeaseStateChanged: async () => {
          // stub — notifications module will handle this
        },
      },
    },
  ],
  exports: [TransitionLeaseStateUseCase, GetLeaseStatusUseCase, GetActiveLeasesSummaryUseCase],
})
export class RentalTrackingModule {}
