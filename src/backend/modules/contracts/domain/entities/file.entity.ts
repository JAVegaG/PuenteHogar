export class FileEntity {
  constructor(
    public readonly id: string,
    public readonly contractId: string,
    public readonly fileTypeId: string,
    public readonly fileStatusId: string,
    public readonly fileUrl: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
