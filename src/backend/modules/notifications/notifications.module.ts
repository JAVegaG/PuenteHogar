import { Module } from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import {
  MESSAGING_CHANNEL,
  NOTIFICATION_REPOSITORY,
  SendNotificationUseCase,
} from './application/use-cases/send-notification.use-case';
import { UpdateNotificationPreferencesUseCase } from './application/use-cases/update-notification-preferences.use-case';
import { GetNotificationsUseCase } from './application/use-cases/get-notifications.use-case';
import { GetNotificationCountUseCase } from './application/use-cases/get-notification-count.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { GetNotificationPreferencesUseCase } from './application/use-cases/get-notification-preferences.use-case';
import { MessagingChannelAdapter } from './infrastructure/adapters/messaging-channel.adapter';
import { NotificationsEtlService } from './infrastructure/etl/notifications-etl.service';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    AuditLoggerService,
    CircuitBreakerFactory,
    NotificationsEtlService,
    SendNotificationUseCase,
    UpdateNotificationPreferencesUseCase,
    GetNotificationsUseCase,
    GetNotificationCountUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    GetNotificationPreferencesUseCase,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: MESSAGING_CHANNEL,
      useClass: MessagingChannelAdapter,
    },
  ],
  exports: [SendNotificationUseCase, UpdateNotificationPreferencesUseCase],
})
export class NotificationsModule { }
