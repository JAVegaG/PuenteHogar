import { PaymentEntity } from '../entities/payment.entity';
import { ScheduledPaymentEntity } from '../entities/scheduled-payment.entity';

export interface CreatePaymentData {
  scheduledPaymentId: string;
  amount: number;
  currency: string;
  paymentDesc?: string;
  idempotencyKey: string;
}

export interface IPaymentRepository {
  persistRawEvent(payload: Record<string, unknown>): Promise<void>;
  findScheduledPaymentById(id: string): Promise<ScheduledPaymentEntity | null>;
  findScheduledPaymentsByLeaseId(leaseId: string): Promise<ScheduledPaymentEntity[]>;
  findPaymentByIdempotencyKey(key: string): Promise<PaymentEntity | null>;
  createPayment(data: CreatePaymentData): Promise<PaymentEntity>;
  updateScheduledPaymentStatus(id: string, status: string): Promise<void>;
  logPaymentEvent(
    paymentId: string,
    status: string,
    platform?: string,
    data?: Record<string, unknown>,
  ): Promise<void>;
  getPaymentHistoryForUser(
    userId: string,
  ): Promise<{ scheduledPayment: ScheduledPaymentEntity; payment: PaymentEntity | null }[]>;
  getLeaseUserIds(
    leaseId: string,
  ): Promise<{ landlordUserId: string | null; tenantUserId: string | null }>;
  findPaymentStatusByName(name: string): Promise<{ id: string } | null>;
}
