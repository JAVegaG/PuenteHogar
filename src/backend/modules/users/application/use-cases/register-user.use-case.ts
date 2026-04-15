import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import type { IPasswordHasher } from '@modules/users/domain/ports/password-hasher.port';
import type { IPIIEncryptor } from '@modules/users/domain/ports/pii-encryptor.port';
import type { IUserRepository } from '@modules/users/domain/ports/user-repository.port';
import { RegisterUserDto } from '@modules/users/application/dtos/register-user.dto';

export const USER_REPOSITORY = 'USER_REPOSITORY';
export const PASSWORD_HASHER = 'PASSWORD_HASHER';
export const PII_ENCRYPTOR = 'PII_ENCRYPTOR';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(PII_ENCRYPTOR) private readonly piiEncryptor: IPIIEncryptor,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  async execute(dto: RegisterUserDto): Promise<{ userId: string; message: string }> {
    const existing = await this.userRepository.findByMail(dto.mail);
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const role = await this.userRepository.findRoleByName(dto.role);
    if (!role) {
      throw new BadRequestException(`Rol '${dto.role}' no encontrado`);
    }

    const documentType = await this.userRepository.findDocumentTypeByCode(dto.documentTypeCode);
    if (!documentType) {
      throw new BadRequestException(`Tipo de documento '${dto.documentTypeCode}' no válido`);
    }

    const hashedPassword = await this.passwordHasher.hash(dto.password);
    const encryptedDocument = this.piiEncryptor.encrypt(dto.documentNumber);
    const encryptedPhone = this.piiEncryptor.encrypt(dto.phoneNumber);

    const naturalDetails =
      dto.personType === 'natural' && dto.naturalDetails
        ? {
            firstName: dto.naturalDetails.firstName,
            lastName: dto.naturalDetails.lastName,
            preferredName: dto.naturalDetails.preferredName,
          }
        : undefined;

    const legalDetails =
      dto.personType === 'legal' && dto.legalDetails
        ? { businessName: dto.legalDetails.businessName }
        : undefined;

    const user = await this.userRepository.create({
      mail: dto.mail,
      hashedPassword,
      userType: dto.userType,
      documentTypeId: documentType.id,
      documentNumber: encryptedDocument,
      phoneNumber: encryptedPhone,
      roleId: role.id,
      personType: dto.personType,
      naturalDetails,
      legalDetails,
    });

    this.auditLogger.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user.id,
      timestamp: new Date(),
    });

    return { userId: user.id, message: 'Registro exitoso' };
  }
}
