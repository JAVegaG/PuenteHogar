import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import {
  PASSWORD_HASHER,
  PII_ENCRYPTOR,
  RegisterUserUseCase,
  USER_REPOSITORY,
} from './application/use-cases/register-user.use-case';
import { AES256PIIEncryptor } from './infrastructure/adapters/aes256-pii-encryptor.adapter';
import { BcryptPasswordHasher } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { JwtStrategy } from './infrastructure/adapters/jwt-strategy';
import { UsersEtlService } from './infrastructure/etl/users-etl.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { UsersController } from './users.controller';
import ms from 'ms'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<ms.StringValue>('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [
    PrismaService,
    RegisterUserUseCase,
    LoginUseCase,
    GetUserProfileUseCase,
    AuditLoggerService,
    JwtStrategy,
    UsersEtlService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: PII_ENCRYPTOR,
      useClass: AES256PIIEncryptor,
    },
  ],
  exports: [JwtModule],
})
export class UsersModule {}
