import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3ClientFactory {
    private client: S3Client | null = null;

    constructor(private readonly configService: ConfigService) { }

    getClient(): S3Client {
        if (!this.client) {
            const region = this.configService.get<string>('objectStorage.region');
            const endpoint = this.configService.get<string>('objectStorage.endpoint');
            this.client = new S3Client({
                region,
                ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
            });
        }
        return this.client;
    }
}
