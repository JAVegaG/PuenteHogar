export interface IObjectStorage {
  uploadFile(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string>;
  getPresignedUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
}
