export interface IObjectStorage {
  uploadPhoto(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string>;
}
