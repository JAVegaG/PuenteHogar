import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { parsePayload } from '@src/shared/etl/parse-payload';

interface PaymentLogPayload {
  paymentStatusId: string;
  status: string;
  platform?: string;
  data?: unknown;
}

interface PaymentPayload {
  scheduledPaymentId: string;
  amount: number;
  currency?: string;
  paymentDesc?: string;
  logs?: PaymentLogPayload[];
}

interface ScheduledPaymentPayload {
  leaseId: string;
  amount: number;
  currency?: string;
  dueDate: string;
  payment?: PaymentPayload;
}

@Injectable()
export class PaymentsEtlService {
  private readonly logger = new Logger(PaymentsEtlService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async processPaymentsRaw(): Promise<void> {
    const records = await this.prisma.paymentsRaw.findMany({
      where: { processed: false },
      take: 100,
    });

    if (records.length === 0) return;

    this.logger.log(`ETL payments: processing ${records.length} raw records`);

    for (const record of records) {
      try {
        const payload = parsePayload<ScheduledPaymentPayload>(record.payload);
        this.validatePayload(payload);

        await this.prisma.$transaction(async (tx) => {
          const scheduled = await tx.scheduledPayment.create({
            data: {
              lease_id: payload.leaseId,
              amount: payload.amount,
              currency: payload.currency ?? 'COP',
              due_date: new Date(payload.dueDate),
            },
          });

          if (payload.payment) {
            const payment = await tx.payment.create({
              data: {
                scheduled_payment_id: scheduled.id,
                amount: payload.payment.amount,
                currency: payload.payment.currency ?? 'COP',
                payment_desc: payload.payment.paymentDesc,
              },
            });

            for (const log of payload.payment.logs ?? []) {
              await tx.paymentLog.create({
                data: {
                  payment_id: payment.id,
                  payment_status_id: log.paymentStatusId,
                  status: log.status,
                  platform: log.platform,
                  data: log.data as any,
                },
              });
            }
          }

          await tx.paymentsRaw.update({
            where: { id: record.id },
            data: { processed: true },
          });
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`ETL payments: error on record ${record.id}: ${reason}`);
        await this.prisma.paymentsRaw.update({
          where: { id: record.id },
          data: { processed: true },
        });
      }
    }

    this.logger.log(`ETL payments: finished processing batch`);
  }

  private validatePayload(payload: ScheduledPaymentPayload): void {
    if (!payload.leaseId) throw new Error('Missing field: leaseId');
    if (payload.amount === undefined) throw new Error('Missing field: amount');
    if (!payload.dueDate) throw new Error('Missing field: dueDate');
  }
}
