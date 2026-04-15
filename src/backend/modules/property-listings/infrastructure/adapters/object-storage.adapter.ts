import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IObjectStorage } from '../../domain/ports/object-storage.port';

@Injectable()
export class ObjectStorageAdapter implements IObjectStorage {
  constructor(private readonly configService: ConfigService) {}

  async uploadPhoto(
    _fileBuffer: Buffer,
    filename: string,
    _mimeType: string,
  ): Promise<string> {
    // MVP stub — returns a placeholder URL
    // Real implementation will use AWS S3 SDK
    const bucket =
      this.configService.get<string>('objectStorage.bucket') ?? 'local';
    return `https://${bucket}.s3.amazonaws.com/${Date.now()}-${filename}`;
  }
}
