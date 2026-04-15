import { Inject, Injectable } from '@nestjs/common';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import { ActiveLeaseSummaryDto } from '../dtos/lease-status.dto';
import { TRACKING_REPOSITORY } from './transition-lease-state.use-case';

@Injectable()
export class GetActiveLeasesSummaryUseCase {
  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: ITrackingRepository,
  ) {}

  async execute(userId: string): Promise<ActiveLeaseSummaryDto[]> {
    const summaries = await this.repository.getActiveLeasesForUser(userId);

    return summaries.map((s) => {
      const dto = new ActiveLeaseSummaryDto();
      dto.leaseId = s.leaseId;
      dto.propertyName = s.propertyName;
      dto.currentState = s.currentState;
      dto.lastChangedAt = s.lastChangedAt;
      return dto;
    });
  }
}
