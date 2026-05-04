import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { parsePayload } from '@src/shared/etl/parse-payload';

interface LeaseStatusHistoryPayload {
  leaseId: string;
  leaseStatusId: string;
  isCurrent?: boolean;
}

interface ListingStatusHistoryPayload {
  listingId: string;
  listingStatusId: string;
  isCurrent?: boolean;
}

interface TrackingRawPayload {
  leaseStatusHistory?: LeaseStatusHistoryPayload;
  listingStatusHistory?: ListingStatusHistoryPayload;
}

@Injectable()
export class RentalTrackingEtlService {
  private readonly logger = new Logger(RentalTrackingEtlService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async processTrackingRaw(): Promise<void> {
    const records = await this.prisma.trackingRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL rental-tracking: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = parsePayload<TrackingRawPayload>(record.payload);
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          if (payload.leaseStatusHistory) {
            const history = await tx.leaseStatusHistory.create({
              data: {
                lease_id: payload.leaseStatusHistory.leaseId,
                lease_status_id: payload.leaseStatusHistory.leaseStatusId,
              },
            });

            if (payload.leaseStatusHistory.isCurrent) {
              await tx.leaseCurrentStatus.upsert({
                where: { lease_id: payload.leaseStatusHistory.leaseId },
                create: {
                  lease_id: payload.leaseStatusHistory.leaseId,
                  lease_status_history_id: history.id,
                  lease_status_id: payload.leaseStatusHistory.leaseStatusId,
                },
                update: {
                  lease_status_history_id: history.id,
                  lease_status_id: payload.leaseStatusHistory.leaseStatusId,
                },
              });
            }
          }

          if (payload.listingStatusHistory) {
            const history = await tx.listingStatusHistory.create({
              data: {
                listing_id: payload.listingStatusHistory.listingId,
                listing_status_id: payload.listingStatusHistory.listingStatusId,
              },
            });

            if (payload.listingStatusHistory.isCurrent) {
              await tx.listingCurrentStatus.upsert({
                where: { listing_id: payload.listingStatusHistory.listingId },
                create: {
                  listing_id: payload.listingStatusHistory.listingId,
                  listing_status_history_id: history.id,
                  listing_status_id: payload.listingStatusHistory.listingStatusId,
                },
                update: {
                  listing_status_history_id: history.id,
                  listing_status_id: payload.listingStatusHistory.listingStatusId,
                },
              });
            }
          }

          await tx.trackingRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL rental-tracking: error on record ${record.id}: ${reason}`);
        await this.prisma.trackingRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL rental-tracking: finished processing batch`);
  }

  private validatePayload(payload: TrackingRawPayload): void {
    if (!payload.leaseStatusHistory && !payload.listingStatusHistory) {
      throw new Error('Payload must contain leaseStatusHistory or listingStatusHistory');
    }
  }
}
