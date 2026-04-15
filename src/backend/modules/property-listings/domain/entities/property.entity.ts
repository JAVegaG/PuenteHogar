import { AddressEntity } from './address.entity';
import { AdditionalFeatureEntity } from './additional-feature.entity';

export class PropertyEntity {
  constructor(
    public readonly id: string,
    public readonly propertyType: string,
    public readonly length: number | null,
    public readonly width: number | null,
    public readonly numberOfBathrooms: number,
    public readonly numberOfRooms: number,
    public readonly isActive: boolean,
    public readonly address: AddressEntity | null,
    public readonly additionalFeatures: AdditionalFeatureEntity[],
  ) {}
}
