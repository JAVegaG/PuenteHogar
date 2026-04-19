import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3ServiceException } from '@aws-sdk/client-s3';
import { IObjectStorage } from '../../domain/ports/object-storage.port';
import {
  S3ClientFactory,
  generateObjectKey,
  buildObjectUrl,
  validateBuffer,
  validateFilename,
  ObjectStorageException,
  ObjectStorageCredentialsException,
  ObjectStorageBucketNotFoundException,
  ObjectStorageValidationException,
} from '@src/shared/s3';

const ALLOWED_MIME_TYPE = 'application/pdf';

@Injectable()
export class ContractObjectStorageAdapter implements IObjectStorage {
  constructor(
    private readonly s3ClientFactory: S3ClientFactory,
    private readonly configService: ConfigService,
  ) { }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    validateBuffer(fileBuffer, filename);
    validateFilename(filename);

    if (mimeType !== ALLOWED_MIME_TYPE) {
      throw new ObjectStorageValidationException(
        `Tipo de contenido no permitido: ${mimeType}. Tipo permitido: application/pdf`,
      );
    }

    const bucket = this.configService.get<string>('objectStorage.bucket')!;
    const region = this.configService.get<string>('objectStorage.region')!;
    const key = generateObjectKey('contracts', filename);

    try {
      const client = this.s3ClientFactory.getClient();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimeType,
        }),
      );

      return buildObjectUrl(bucket, region, key);
    } catch (error) {
      if (error instanceof S3ServiceException) {
        if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
          throw new ObjectStorageCredentialsException(
            'Error de configuración de credenciales al acceder al servicio de almacenamiento',
          );
        }
        if (error.name === 'NoSuchBucket') {
          throw new ObjectStorageBucketNotFoundException(
            `El bucket configurado '${bucket}' no existe`,
          );
        }
      }

      throw new ObjectStorageException(
        `Error al subir archivo '${filename}': error de comunicación con el servicio de almacenamiento`,
      );
    }
  }
}
