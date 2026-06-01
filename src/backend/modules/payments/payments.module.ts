import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '@modules/notifications';
import { PortfolioCrossModuleQueryService } from '@modules/landlord-portfolio/infrastructure/repositories/portfolio-cross-module-query.service';
import { PORTFOLIO_CROSS_MODULE_QUERY } from '@modules/landlord-portfolio/domain/ports/cross-module-query.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { GetPaymentHistoryUseCase } from './application/use-cases/get-payment-history.use-case';
import { GetPaymentUnitsUseCase } from './application/use-cases/get-payment-units.use-case';
import { GetPaymentHistoryByUnitUseCase } from './application/use-cases/get-payment-history-by-unit.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import {
  InitiatePaymentUseCase,
  PAYMENT_GATEWAY,
  PAYMENT_NOTIFICATION_PORT,
  PAYMENT_REPOSITORY,
} from './application/use-cases/initiate-payment.use-case';
import { PaymentGatewayAdapter } from './infrastructure/adapters/payment-gateway.adapter';
import { PaymentNotificationAdapter } from './infrastructure/adapters/payment-notification.adapter';
import { PaymentSchedulingAdapter } from './infrastructure/adapters/payment-scheduling.adapter';
import { PaymentsEtlService } from './infrastructure/etl/payments-etl.service';
import { PrismaPaymentRepository } from './infrastructure/repositories/prisma-payment.repository';
import { PaymentsCrossModuleQueryService } from './infrastructure/repositories/payments-cross-module-query.service';
import { PAYMENTS_CROSS_MODULE_QUERY } from './domain/ports/cross-module-query.port';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [ConfigModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    AuditLoggerService,
    CircuitBreakerFactory,
    PaymentsEtlService,
    InitiatePaymentUseCase,
    GetPaymentHistoryUseCase,
    GetPaymentUnitsUseCase,
    GetPaymentHistoryByUnitUseCase,
    HandlePaymentWebhookUseCase,
    PaymentsCrossModuleQueryService,
    PortfolioCrossModuleQueryService,
    PaymentSchedulingAdapter,
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
      useClass: PaymentNotificationAdapter,
    },
    {
      provide: PAYMENTS_CROSS_MODULE_QUERY,
      useExisting: PaymentsCrossModuleQueryService,
    },
    {
      provide: PORTFOLIO_CROSS_MODULE_QUERY,
      useExisting: PortfolioCrossModuleQueryService,
    },
  ],
  exports: [
    InitiatePaymentUseCase,
    GetPaymentHistoryUseCase,
    GetPaymentUnitsUseCase,
    GetPaymentHistoryByUnitUseCase,
    HandlePaymentWebhookUseCase,
    PaymentsCrossModuleQueryService,
    PaymentSchedulingAdapter,
    PAYMENTS_CROSS_MODULE_QUERY,
  ],
})
export class PaymentsModule { }
