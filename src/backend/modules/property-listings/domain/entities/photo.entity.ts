export class PhotoEntity {
  constructor(
    public readonly id: string,
    public readonly listingId: string,
    public readonly fileUrl: string,
    public readonly isMain: boolean,
  ) {}
}
