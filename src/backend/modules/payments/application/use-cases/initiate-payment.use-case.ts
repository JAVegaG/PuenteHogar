import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import type { IPaymentGateway } from '@modules/payments/domain/ports/payment-gateway.port';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { InitiatePaymentDto } from '@modules/payments/application/dtos/initiate-payment.dto';

export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
export const PAYMENT_NOTIFICATION_PORT = 'PAYMENT_NOTIFICATION_PORT';

@Injectable()
export class InitiatePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly repository: IPaymentRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly circuitBreakerFactory: CircuitBreakerFactory,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(
    dto: InitiatePaymentDto,
    userId: string,
    userRoles: string[],
  ): Promise<{ message: string; redirectUrl?: string; idempotencyKey: string }> {
    if (!userRoles.includes('TENANT')) {
      throw new ForbiddenException('Solo los arrendatarios pueden iniciar pagos');
    }

    const scheduledPayment = await this.repository.findScheduledPaymentById(
      dto.scheduledPaymentId,
    );
    if (!scheduledPayment) {
      throw new NotFoundException('Pago programado no encontrado');
    }

    if (scheduledPayment.status === 'PAID') {
      throw new BadRequestException('Este pago ya fue realizado');
    }

    const idempotencyKey = randomUUID();

    // Idempotency check — prevent duplicate transactions (Req 6.2)
    const existing = await this.repository.findPaymentByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { message: 'Pago ya procesado', idempotencyKey };
    }

    // Persist raw event BEFORE calling gateway (Req 6.10)
    await this.repository.persistRawEvent({
      scheduledPaymentId: scheduledPayment.id,
      amount: scheduledPayment.amount,
      currency: scheduledPayment.currency,
      idempotencyKey,
      tenantUserId: userId,
      event: 'PAYMENT_INITIATED',
    });

    const breaker = this.circuitBreakerFactory.create('payment-gateway', 'payment');

    // Check if circuit is open before attempting — reject with 503 (Req 6.11)
    if (breaker.getState() === 'OPEN') {
      this.auditLogger.log({
        userId,
        action: 'PAYMENT_REJECTED_CIRCUIT_OPEN',
        resource: 'ScheduledPayment',
        resourceId: scheduledPayment.id,
        timestamp: new Date(),
        metadata: { idempotencyKey },
      });
      throw new ServiceUnavailableException(
        'El servicio de pagos no está disponible temporalmente. Intente más tarde.',
      );
    }

    let redirectUrl: string | undefined;
    let gatewayStatus: string | undefined;
    let circuitOpen = false;

    await breaker.execute(
      async () => {
        const result = await this.paymentGateway.initiatePayment({
          scheduledPaymentId: scheduledPayment.id,
          amount: scheduledPayment.amount,
          currency: scheduledPayment.currency,
          idempotencyKey,
          tenantUserId: userId,
        });

        gatewayStatus = result.status;
        redirectUrl = result.redirectUrl;

        // Create payment record and log event (Req 6.6)
        const payment = await this.repository.createPayment({
          scheduledPaymentId: scheduledPayment.id,
          amount: scheduledPayment.amount,
          currency: scheduledPayment.currency,
          paymentDesc: result.externalTransactionId,
          idempotencyKey,
        });

        await this.repository.logPaymentEvent(payment.id, result.status, 'gateway', {
          externalTransactionId: result.externalTransactionId,
          idempotencyKey,
        });
      },
      () => {
        // Circuit opened during this call — set PROCESSING state (Req 6.5)
        circuitOpen = true;
        this.repository
          .updateScheduledPaymentStatus(scheduledPayment.id, 'PROCESSING')
          .catch(() => undefined);
      },
    );

    this.auditLogger.log({
      userId,
      action: 'PAYMENT_INITIATED',
      resource: 'ScheduledPayment',
      resourceId: scheduledPayment.id,
      timestamp: new Date(),
      metadata: { idempotencyKey, status: gatewayStatus ?? 'PROCESSING' },
    });

    if (circuitOpen) {
      throw new ServiceUnavailableException(
        'El servicio de pagos no está disponible temporalmente. El estado del pago está siendo verificado.',
      );
    }

    return {
      message:
        gatewayStatus === 'APPROVED'
          ? 'Pago iniciado exitosamente'
          : 'Pago rechazado por la pasarela',
      redirectUrl,
      idempotencyKey,
    };
  }
}
