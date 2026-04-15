import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';

interface LeasePayload {
  portfolioUnitId: string;
  userId: string;
  startDate: string;
  endDate?: string;
  encBlob?: string;
}

interface PortfolioUnitPayload {
  propertyId: string;
  conditions?: string;
  leaseBaseAmount: number;
  leaseBaseCurrency?: string;
  lease?: LeasePayload;
}

interface PortfolioRawPayload {
  userId: string;
  name: string;
  units?: PortfolioUnitPayload[];
}

@Injectable()
export class LandlordPortfolioEtlService {
  private readonly logger = new Logger(LandlordPortfolioEtlService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPortfolioRaw(): Promise<void> {
    const records = await this.prisma.portfolioRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL landlord-portfolio: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = record.payload as unknown as PortfolioRawPayload;
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          const portfolio = await tx.landlordPortfolio.create({
            data: {
              user_id: payload.userId,
              name: payload.name,
            },
          });

          for (const unit of payload.units ?? []) {
            const portfolioUnit = await tx.portfolioUnit.create({
              data: {
                portfolio_id: portfolio.id,
                property_id: unit.propertyId,
                conditions: unit.conditions,
                lease_base_amount: unit.leaseBaseAmount,
                lease_base_currency: unit.leaseBaseCurrency ?? 'COP',
              },
            });

            if (unit.lease) {
              await tx.lease.create({
                data: {
                  portfolio_unit_id: portfolioUnit.id,
                  user_id: unit.lease.userId,
                  start_date: new Date(unit.lease.startDate),
                  end_date: unit.lease.endDate ? new Date(unit.lease.endDate) : undefined,
                  enc_blob: unit.lease.encBlob,
                },
              });
            }
          }

          await tx.portfolioRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL landlord-portfolio: error on record ${record.id}: ${reason}`);
        await this.prisma.portfolioRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL landlord-portfolio: finished processing batch`);
  }

  private validatePayload(payload: PortfolioRawPayload): void {
    if (!payload.userId) throw new Error('Missing field: userId');
    if (!payload.name) throw new Error('Missing field: name');
  }
}
