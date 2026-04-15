import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { GetPaymentHistoryUseCase } from './application/use-cases/get-payment-history.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import {
  InitiatePaymentUseCase,
  PAYMENT_GATEWAY,
  PAYMENT_NOTIFICATION_PORT,
  PAYMENT_REPOSITORY,
} from './application/use-cases/initiate-payment.use-case';
import { PaymentGatewayAdapter } from './infrastructure/adapters/payment-gateway.adapter';
import { PaymentsEtlService } from './infrastructure/etl/payments-etl.service';
import { PrismaPaymentRepository } from './infrastructure/repositories/prisma-payment.repository';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    AuditLoggerService,
    CircuitBreakerFactory,
    PaymentsEtlService,
    InitiatePaymentUseCase,
    GetPaymentHistoryUseCase,
    HandlePaymentWebhookUseCase,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PrismaPaymentRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: PaymentGatewayAdapter,
    },
    {
      provide: PAYMENT_NOTIFICATION_PORT,
      useValue: {
        notifyPaymentReceived: async () => {
          // stub — notifications module will handle this
        },
      },
    },
  ],
  exports: [
    InitiatePaymentUseCase,
    GetPaymentHistoryUseCase,
    HandlePaymentWebhookUseCase,
  ],
})
export class PaymentsModule {}
