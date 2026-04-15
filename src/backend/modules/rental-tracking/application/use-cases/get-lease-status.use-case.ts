import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import {
  LeaseStatusHistoryItemDto,
  LeaseStatusResponseDto,
} from '../dtos/lease-status.dto';
import { TRACKING_REPOSITORY } from './transition-lease-state.use-case';

@Injectable()
export class GetLeaseStatusUseCase {
  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: ITrackingRepository,
  ) {}

  async execute(leaseId: string, requestingUserId: string): Promise<LeaseStatusResponseDto> {
    const landlordId = await this.repository.getLandlordUserId(leaseId);
    if (!landlordId) throw new NotFoundException('Lease no encontrado');

    const tenantId = await this.repository.getTenantUserId(leaseId);
    if (!tenantId) throw new NotFoundException('Lease no encontrado');

    const isParty = requestingUserId === landlordId || requestingUserId === tenantId;
    if (!isParty) throw new ForbiddenException('No tienes acceso a este lease');

    const current = await this.repository.getCurrentStatus(leaseId);
    if (!current) throw new NotFoundException('Estado del lease no encontrado');

    const history = await this.repository.getStatusHistory(leaseId);

    const dto = new LeaseStatusResponseDto();
    dto.leaseId = leaseId;
    dto.currentState = current.state;
    dto.lastChangedAt = current.lastChangedAt;
    dto.history = history.map((h) => {
      const item = new LeaseStatusHistoryItemDto();
      item.id = h.id;
      item.state = h.state;
      item.recordedAt = h.recordCreatedAt;
      return item;
    });

    return dto;
  }
}
