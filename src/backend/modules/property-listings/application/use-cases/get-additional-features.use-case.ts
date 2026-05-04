import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
import { AdditionalFeatureResponseDto } from '@modules/property-listings/application/dtos/additional-feature-response.dto';

@Injectable()
export class GetAdditionalFeaturesUseCase {
    constructor(private readonly prisma: PrismaService) { }

    async execute(main?: boolean): Promise<AdditionalFeatureResponseDto[]> {
        const where: Record<string, unknown> = {
            active: true,
            ...softDeleteFilter,
        };

        if (main !== undefined) {
            where.main = main;
        }

        const features = await this.prisma.additionalFeature.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        return features.map((feature) => {
            const dto = new AdditionalFeatureResponseDto();
            dto.id = feature.id;
            dto.name = feature.name;
            dto.description = feature.description;
            dto.type = feature.type;
            dto.element = feature.element;
            dto.active = feature.active;
            dto.main = feature.main;
            dto.required = feature.required;
            dto.errorMessage = feature.error_message;
            return dto;
        });
    }
}
