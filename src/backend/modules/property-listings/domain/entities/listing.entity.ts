import { PhotoEntity } from './photo.entity';

export class ListingEntity {
  constructor(
    public readonly id: string,
    public readonly portfolioUnitId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly listingDate: Date,
    public readonly price: number,
    public readonly currency: string,
    public readonly isActive: boolean,
    public readonly photos: PhotoEntity[],
  ) {}
}
