import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import type { ITrackingNotificationPort } from '@modules/rental-tracking/domain/ports/notification.port';
import type { TransitionLeaseStateDto } from '../dtos/lease-status.dto';

export const TRACKING_REPOSITORY = 'TRACKING_REPOSITORY';
export const TRACKING_NOTIFICATION_PORT = 'TRACKING_NOTIFICATION_PORT';

const NOTIFY_ON_STATES = new Set(['CONTRACT_SIGNED', 'PAYMENT_RECEIVED']);

@Injectable()
export class TransitionLeaseStateUseCase {
  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: ITrackingRepository,
    @Inject(TRACKING_NOTIFICATION_PORT)
    private readonly notificationPort: ITrackingNotificationPort,
  ) {}

  async execute(dto: TransitionLeaseStateDto, requestingUserId: string): Promise<void> {
    const landlordId = await this.repository.getLandlordUserId(dto.leaseId);
    if (!landlordId) throw new NotFoundException('Lease no encontrado');

    const tenantId = await this.repository.getTenantUserId(dto.leaseId);
    if (!tenantId) throw new NotFoundException('Lease no encontrado');

    const isParty = requestingUserId === landlordId || requestingUserId === tenantId;
    if (!isParty) throw new ForbiddenException('No tienes acceso a este lease');

    await this.repository.recordTransition(dto.leaseId, dto.newState);

    if (NOTIFY_ON_STATES.has(dto.newState)) {
      // fire-and-forget — no await, no throw
      void this.notificationPort
        .notifyLeaseStateChanged(landlordId, tenantId, dto.leaseId, dto.newState)
        .catch(() => undefined);
    }
  }
}
