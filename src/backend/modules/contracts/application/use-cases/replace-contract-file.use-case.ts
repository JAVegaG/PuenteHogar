import {
    BadGatewayException,
    ConflictException,
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
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import { ContractSummaryDto } from '@modules/contracts/application/dtos/contract-summary.dto';
import { CONTRACT_REPOSITORY, CONTRACT_OBJECT_STORAGE } from './upload-contract.use-case';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class ReplaceContractFileUseCase {
    constructor(
        @Inject(CONTRACT_REPOSITORY)
        private readonly repository: IContractRepository,
        @Inject(CONTRACT_OBJECT_STORAGE)
        private readonly objectStorage: IObjectStorage,
        private readonly auditLogger: AuditLoggerService,
    ) { }

    async execute(
        contractId: string,
        file: { buffer: Buffer; originalname: string; size: number; mimetype: string },
        userId: string,
    ): Promise<ContractSummaryDto> {
        const contract = await this.repository.findById(contractId);
        if (!contract) {
            throw new NotFoundException('Contrato no encontrado');
        }

        const parties = await this.repository.findContractParties(contractId);
        const isLandlord = parties.some(
            (p) => p.userId === userId && p.roleInContract === 'LANDLORD',
        );
        if (!isLandlord) {
            throw new ForbiddenException('No tienes permiso para realizar esta acción');
        }

        if (contract.status === 'SIGNATURE_PENDING') {
            throw new ConflictException(
                'No se puede reemplazar el archivo de un contrato en proceso de firma',
            );
        }
        if (contract.status === 'SIGNED') {
            throw new ConflictException(
                'No se puede reemplazar el archivo de un contrato firmado',
            );
        }

        if (file.mimetype !== 'application/pdf') {
            throw new UnprocessableEntityException('Solo se permiten archivos PDF');
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new UnprocessableEntityException('El archivo no puede superar 10 MB');
        }

        let objectKey: string;
        try {
            objectKey = await this.objectStorage.uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
            );
        } catch (error) {
            if (error instanceof ObjectStorageValidationException) {
                throw new UnprocessableEntityException(error.message);
            }
            if (
                error instanceof ObjectStorageCredentialsException ||
                error instanceof ObjectStorageBucketNotFoundException
            ) {
                throw new BadGatewayException('Error de configuración de almacenamiento');
            }
            if (error instanceof ObjectStorageException) {
                throw new BadGatewayException(
                    'Error temporal de almacenamiento. Intenta de nuevo.',
                );
            }
            throw error;
        }

        const updated = await this.repository.updateFileUrl(contractId, objectKey);

        this.auditLogger.log({
            userId,
            action: 'CONTRACT_FILE_REPLACED',
            resource: 'Contract',
            resourceId: contractId,
            timestamp: new Date(),
        });

        const dto = new ContractSummaryDto();
        dto.id = updated.id;
        dto.leaseId = updated.leaseId;
        dto.status = updated.status;
        dto.startDate = updated.startDate;
        dto.endDate = updated.endDate;
        dto.fileUrl = updated.fileUrl;
        dto.signedAt = updated.signedAt;
        dto.externalSigningId = updated.externalSigningId;
        dto.parties = parties.map((p) => ({
            userId: p.userId,
            role: p.roleInContract,
        }));

        return dto;
    }
}
