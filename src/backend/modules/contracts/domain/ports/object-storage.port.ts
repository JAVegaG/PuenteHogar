export interface IObjectStorage {
  uploadFile(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string>;
}
