import {
  BadGatewayException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import {
  ObjectStorageException,
  ObjectStorageCredentialsException,
  ObjectStorageBucketNotFoundException,
  ObjectStorageValidationException,
} from '@src/shared/s3';
import { ContractEntity } from '@modules/contracts/domain/entities/contract.entity';
import { ContractPartyEntity } from '@modules/contracts/domain/entities/contract-party.entity';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import { ContractSummaryDto } from '@modules/contracts/application/dtos/contract-summary.dto';
import { CreateContractDto } from '@modules/contracts/application/dtos/create-contract.dto';

export const CONTRACT_REPOSITORY = 'CONTRACT_REPOSITORY';
export const E_SIGNATURE_PROVIDER = 'E_SIGNATURE_PROVIDER';
export const CONTRACT_OBJECT_STORAGE = 'CONTRACT_OBJECT_STORAGE';
export const CONTRACT_NOTIFICATION_PORT = 'CONTRACT_NOTIFICATION_PORT';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly repository: IContractRepository,
    @Inject(CONTRACT_OBJECT_STORAGE)
    private readonly objectStorage: IObjectStorage,
    private readonly auditLogger: AuditLoggerService,
  ) { }

  async execute(
    file: { buffer: Buffer; originalname: string; size: number; mimetype: string },
    dto: CreateContractDto,
    userId: string,
    userRoles: string[],
  ): Promise<ContractSummaryDto> {
    if (!userRoles.includes('LANDLORD')) {
      throw new ForbiddenException('Acceso denegado');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new UnprocessableEntityException('Solo se permiten archivos PDF');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new UnprocessableEntityException('El archivo no puede superar 10 MB');
    }

    const leaseOwnerUserId = await this.repository.getLeaseOwnerUserId(dto.leaseId);
    if (!leaseOwnerUserId) {
      throw new NotFoundException('Lease no encontrado');
    }
    if (leaseOwnerUserId !== userId) {
      throw new ForbiddenException('No tienes permiso sobre este lease');
    }

    let objectKey: string;
    try {
      objectKey = await this.objectStorage.uploadFile(file.buffer, file.originalname, file.mimetype);
    } catch (error) {
      if (error instanceof ObjectStorageValidationException) {
        throw new UnprocessableEntityException(error.message);
      }
      if (error instanceof ObjectStorageCredentialsException || error instanceof ObjectStorageBucketNotFoundException) {
        throw new BadGatewayException('Error de configuración de almacenamiento');
      }
      if (error instanceof ObjectStorageException) {
        throw new BadGatewayException('Error temporal de almacenamiento. Intenta de nuevo.');
      }
      throw error;
    }

    const tenantUserId = await this.repository.getLeaseTenantUserId(dto.leaseId);

    const fileType = await this.repository.findFileTypeByName('CONTRACT_PDF');
    const fileStatus = await this.repository.findFileStatusByName('ACTIVE');

    const fileTypeId = fileType?.id;
    const fileStatusId = fileStatus?.id;

    if (!fileTypeId || !fileStatusId) {
      throw new UnprocessableEntityException(
        'Configuración de archivos incompleta. Contacte al administrador.',
      );
    }

    const parsedStartDate = new Date(dto.startDate);
    if (isNaN(parsedStartDate.getTime())) {
      throw new UnprocessableEntityException(
        'La fecha de inicio no es válida. Use formato ISO 8601 (ej: 2025-01-15)',
      );
    }

    let parsedEndDate: Date | undefined;
    if (dto.endDate) {
      parsedEndDate = new Date(dto.endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new UnprocessableEntityException(
          'La fecha de fin no es válida. Use formato ISO 8601 (ej: 2025-01-15)',
        );
      }
    }

    const contract = await this.repository.create({
      leaseId: dto.leaseId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      fileUrl: objectKey,
      fileTypeId,
      fileStatusId,
      landlordUserId: userId,
      tenantUserId: tenantUserId ?? '',
    });

    this.auditLogger.log({
      userId,
      action: 'CONTRACT_UPLOADED',
      resource: 'Contract',
      resourceId: contract.id,
      timestamp: new Date(),
    });

    return this.toSummaryDto(contract, [
      { userId, role: 'LANDLORD' },
      ...(tenantUserId ? [{ userId: tenantUserId, role: 'TENANT' }] : []),
    ]);
  }

  private toSummaryDto(
    entity: ContractEntity,
    parties: { userId: string; role: string }[],
  ): ContractSummaryDto {
    const dto = new ContractSummaryDto();
    dto.id = entity.id;
    dto.leaseId = entity.leaseId;
    dto.status = entity.status;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.fileUrl = entity.fileUrl;
    dto.signedAt = entity.signedAt;
    dto.externalSigningId = entity.externalSigningId;
    dto.parties = parties.map((p) => ({ ...p, name: null }));
    return dto;
  }
}

export function toContractSummaryDto(
  entity: ContractEntity,
  parties: ContractPartyEntity[],
): ContractSummaryDto {
  const dto = new ContractSummaryDto();
  dto.id = entity.id;
  dto.leaseId = entity.leaseId;
  dto.status = entity.status;
  dto.startDate = entity.startDate;
  dto.endDate = entity.endDate;
  dto.fileUrl = entity.fileUrl;
  dto.signedAt = entity.signedAt;
  dto.externalSigningId = entity.externalSigningId;
  dto.parties = parties.map((p) => ({ userId: p.userId, role: p.roleInContract, name: null }));
  return dto;
}
