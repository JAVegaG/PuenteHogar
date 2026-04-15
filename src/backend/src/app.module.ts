import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { RedisModule } from './shared/redis/redis.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuditLoggerService } from './shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from './shared/circuit-breaker/circuit-breaker.factory';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { ValidationInterceptor } from './shared/interceptors/validation.interceptor';
import { UsersModule } from '@modules/users/users.module';
import { PropertyListingsModule } from '@modules/property-listings/property-listings.module';
import { LandlordPortfolioModule } from '@modules/landlord-portfolio/landlord-portfolio.module';
import { ContractsModule } from '@modules/contracts/contracts.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { AccountingModule } from '@modules/accounting/accounting.module';
import { RentalTrackingModule } from '@modules/rental-tracking/rental-tracking.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    PrismaModule,
    UsersModule,
    PropertyListingsModule,
    LandlordPortfolioModule,
    ContractsModule,
    PaymentsModule,
    AccountingModule,
    RentalTrackingModule,
    NotificationsModule,
  ],
  providers: [
    AuditLoggerService,
    CircuitBreakerFactory,
    // Global JWT guard — @Public() decorator bypasses it
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global sanitization interceptor (XSS / SQL injection)
    {
      provide: APP_INTERCEPTOR,
      useClass: ValidationInterceptor,
    },
  ],
  exports: [AuditLoggerService, CircuitBreakerFactory],
})
export class AppModule {}
