import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { IPasswordHasher } from '@modules/users/domain/ports/password-hasher.port';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import { AuthTokenDto } from '@modules/users/application/dtos/auth-token.dto';
import { LoginDto } from '@modules/users/application/dtos/login.dto';
import { PASSWORD_HASHER, USER_REPOSITORY } from './register-user.use-case';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    private readonly jwtService: JwtService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(dto: LoginDto, ip: string): Promise<AuthTokenDto> {
    const user = await this.userRepository.findByMail(dto.mail);

    const passwordMatch =
      user !== null
        ? await this.passwordHasher.compare(dto.password, user.hashedPassword)
        : false;

    if (!user || !passwordMatch) {
      this.auditLogger.logFailedLogin({
        userIdentifier: dto.mail,
        ip,
        timestamp: new Date(),
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, roles: user.roles };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, userId: user.id, roles: user.roles };
  }
}
