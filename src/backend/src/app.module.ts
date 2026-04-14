import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { RedisModule } from './shared/redis/redis.module';
import { AuditLoggerService } from './shared/audit/audit-logger.service';
import { CircuitBreakerFactory } from './shared/circuit-breaker/circuit-breaker.factory';
import { PrismaModule } from './shared/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    RedisModule,
    PrismaModule,
  ],
  providers: [AuditLoggerService, CircuitBreakerFactory],
  exports: [AuditLoggerService, CircuitBreakerFactory],
})
export class AppModule {}
