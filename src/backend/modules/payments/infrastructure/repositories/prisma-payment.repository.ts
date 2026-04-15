import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { ScheduledPaymentEntity } from '../../domain/entities/scheduled-payment.entity';
import {
  CreatePaymentData,
  IPaymentRepository,
} from '../../domain/ports/payment-repository.port';

@Injectable()
export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async persistRawEvent(payload: Record<string, unknown>): Promise<void> {
    await this.prisma.paymentsRaw.create({
      data: { payload: JSON.parse(JSON.stringify(payload)) },
    });
  }

  async findScheduledPaymentById(id: string): Promise<ScheduledPaymentEntity | null> {
    const record = await this.prisma.scheduledPayment.findUnique({
      where: { id },
      include: {
        payments: {
          include: { logs: { orderBy: { creation_date: 'desc' } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!record) return null;

    // Derive status from the latest payment log, defaulting to PENDING
    const latestLog = record.payments[0]?.logs[0];
    const status = latestLog?.status ?? 'PENDING';

    return new ScheduledPaymentEntity(
      record.id,
      record.lease_id,
      record.amount.toNumber(),
      record.currency,
      record.due_date,
      status,
    );
  }

  async findScheduledPaymentsByLeaseId(leaseId: string): Promise<ScheduledPaymentEntity[]> {
    const records = await this.prisma.scheduledPayment.findMany({
      where: { lease_id: leaseId },
      include: {
        payments: {
          include: { logs: { orderBy: { creation_date: 'desc' } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    return records.map((record: typeof records[number]) => {
      const latestLog = record.payments[0]?.logs[0];
      const status = latestLog?.status ?? 'PENDING';
      return new ScheduledPaymentEntity(
        record.id,
        record.lease_id,
        record.amount.toNumber(),
        record.currency,
        record.due_date,
        status,
      );
    });
  }

  async findPaymentByIdempotencyKey(key: string): Promise<PaymentEntity | null> {
    // MVP: idempotency key stored in payment_desc
    const record = await this.prisma.payment.findFirst({
      where: { payment_desc: key },
    });

    if (!record) return null;

    return new PaymentEntity(
      record.id,
      record.scheduled_payment_id,
      record.amount.toNumber(),
      record.currency,
      record.payment_desc,
      record.created_at,
    );
  }

  async createPayment(data: CreatePaymentData): Promise<PaymentEntity> {
    const payment = await this.prisma.payment.create({
      data: {
        scheduled_payment_id: data.scheduledPaymentId,
        amount: data.amount,
        currency: data.currency,
        payment_desc: data.idempotencyKey,
      },
    });

    return new PaymentEntity(
      payment.id,
      payment.scheduled_payment_id,
      payment.amount.toNumber(),
      payment.currency,
      payment.payment_desc,
      payment.created_at,
    );
  }

  async updateScheduledPaymentStatus(id: string, status: string): Promise<void> {
    const paymentStatus = await this.findPaymentStatusByName(status);
    if (!paymentStatus) {
      throw new Error(`PaymentStatus '${status}' not found in database`);
    }

    // Status is tracked via logs — find the latest payment for this scheduled payment
    const latestPayment = await this.prisma.payment.findFirst({
      where: { scheduled_payment_id: id },
      orderBy: { created_at: 'desc' },
    });

    if (latestPayment) {
      await this.prisma.paymentLog.create({
        data: {
          payment_id: latestPayment.id,
          payment_status_id: paymentStatus.id,
          status,
        },
      });
    }
  }

  async logPaymentEvent(
    paymentId: string,
    status: string,
    platform?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const paymentStatus = await this.findPaymentStatusByName(status);
    if (!paymentStatus) {
      throw new Error(`PaymentStatus '${status}' not found in database`);
    }

    await this.prisma.paymentLog.create({
      data: {
        payment_id: paymentId,
        payment_status_id: paymentStatus.id,
        status,
        platform: platform ?? null,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
      },
    });
  }

  async getPaymentHistoryForUser(
    userId: string,
  ): Promise<{ scheduledPayment: ScheduledPaymentEntity; payment: PaymentEntity | null }[]> {
    // 1. Find all leases where user is tenant
    const leases = await this.prisma.lease.findMany({
      where: { user_id: userId },
      select: { id: true },
    });

    if (leases.length === 0) return [];

    const leaseIds = leases.map((l: { id: string }) => l.id);

    // 2. Find all scheduled payments for those leases
    const scheduledPayments = await this.prisma.scheduledPayment.findMany({
      where: { lease_id: { in: leaseIds } },
      include: {
        payments: {
          include: { logs: { orderBy: { creation_date: 'desc' } } },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    return scheduledPayments.map((sp: typeof scheduledPayments[number]) => {
      const latestLog = sp.payments[0]?.logs[0];
      const status = latestLog?.status ?? 'PENDING';

      const scheduledPaymentEntity = new ScheduledPaymentEntity(
        sp.id,
        sp.lease_id,
        sp.amount.toNumber(),
        sp.currency,
        sp.due_date,
        status,
      );

      const latestPayment = sp.payments[0];
      const paymentEntity = latestPayment
        ? new PaymentEntity(
            latestPayment.id,
            latestPayment.scheduled_payment_id,
            latestPayment.amount.toNumber(),
            latestPayment.currency,
            latestPayment.payment_desc,
            latestPayment.created_at,
          )
        : null;

      return { scheduledPayment: scheduledPaymentEntity, payment: paymentEntity };
    });
  }

  async getLeaseUserIds(
    leaseId: string,
  ): Promise<{ landlordUserId: string | null; tenantUserId: string | null }> {
    // Tenant: directly on Lease
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId },
      select: { user_id: true, portfolio_unit_id: true },
    });

    if (!lease) return { landlordUserId: null, tenantUserId: null };

    const tenantUserId = lease.user_id;

    // Landlord: Lease → PortfolioUnit → LandlordPortfolio
    const unit = await this.prisma.portfolioUnit.findFirst({
      where: { id: lease.portfolio_unit_id },
      select: { portfolio_id: true },
    });

    if (!unit) return { landlordUserId: null, tenantUserId };

    const portfolio = await this.prisma.landlordPortfolio.findFirst({
      where: { id: unit.portfolio_id },
      select: { user_id: true },
    });

    return {
      landlordUserId: portfolio?.user_id ?? null,
      tenantUserId,
    };
  }

  async findPaymentStatusByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.paymentStatus.findUnique({ where: { name } });
  }
}
