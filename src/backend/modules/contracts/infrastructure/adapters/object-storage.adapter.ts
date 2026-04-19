import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IObjectStorage } from '../../domain/ports/object-storage.port';

@Injectable()
export class ContractObjectStorageAdapter implements IObjectStorage {
  constructor(private readonly configService: ConfigService) { }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const bucket =
      this.configService.get<string>('objectStorage.bucket') || 'mvp-placeholder-bucket';
    return `https://${bucket}.s3.amazonaws.com/contracts/${Date.now()}-${filename}`;
  }
}
