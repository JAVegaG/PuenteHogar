import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import {
  LeaseCurrentStatusEntity,
  LeaseState,
  LeaseStatusHistoryEntity,
} from '@modules/rental-tracking/domain/entities/lease-status.entity';
import {
  ActiveLeaseSummary,
  ITrackingRepository,
} from '@modules/rental-tracking/domain/ports/tracking-repository.port';

@Injectable()
export class PrismaTrackingRepository implements ITrackingRepository {
  constructor(private readonly prisma: PrismaService) { }

  async getCurrentStatus(leaseId: string): Promise<LeaseCurrentStatusEntity | null> {
    const current = await this.prisma.leaseCurrentStatus.findUnique({
      where: { lease_id: leaseId },
      include: { status: true, history: true },
    });
    if (!current) return null;
    return new LeaseCurrentStatusEntity(
      current.lease_id,
      current.status.name as LeaseState,
      current.history.record_created_at,
    );
  }

  async getStatusHistory(leaseId: string): Promise<LeaseStatusHistoryEntity[]> {
    const rows = await this.prisma.leaseStatusHistory.findMany({
      where: { lease_id: leaseId },
      include: { status: true },
      orderBy: { record_created_at: 'asc' },
    });
    return rows.map(
      (r) =>
        new LeaseStatusHistoryEntity(r.id, r.lease_id, r.status.name as LeaseState, r.record_created_at),
    );
  }

  async recordTransition(leaseId: string, newState: LeaseState): Promise<LeaseStatusHistoryEntity> {
    return this.prisma.$transaction(async (tx) => {
      const leaseStatus = await tx.leaseStatus.findUnique({ where: { name: newState } });
      if (!leaseStatus) throw new Error(`LeaseStatus '${newState}' not found in database`);

      const historyEntry = await tx.leaseStatusHistory.create({
        data: {
          lease_id: leaseId,
          lease_status_id: leaseStatus.id,
        },
        include: { status: true },
      });

      // Upsert the current status pointer
      await tx.leaseCurrentStatus.upsert({
        where: { lease_id: leaseId },
        create: {
          lease_id: leaseId,
          lease_status_history_id: historyEntry.id,
          lease_status_id: leaseStatus.id,
        },
        update: {
          lease_status_history_id: historyEntry.id,
          lease_status_id: leaseStatus.id,
        },
      });

      return new LeaseStatusHistoryEntity(
        historyEntry.id,
        historyEntry.lease_id,
        historyEntry.status.name as LeaseState,
        historyEntry.record_created_at,
      );
    });
  }

  async getActiveLeasesForUser(userId: string): Promise<ActiveLeaseSummary[]> {
    // Find leases where user is landlord (via portfolio) or tenant
    const [landlordLeases, tenantLeases] = await Promise.all([
      this.prisma.lease.findMany({
        where: {
          deleted_at: null,
          portfolio_unit: {
            portfolio: { user_id: userId },
          },
        },
        include: {
          portfolio_unit: {
            include: {
              portfolio: true,
            },
          },
        },
      }),
      this.prisma.lease.findMany({
        where: { user_id: userId, deleted_at: null },
        include: {
          portfolio_unit: {
            include: {
              portfolio: true,
            },
          },
        },
      }),
    ]);

    const allLeases = [...landlordLeases, ...tenantLeases];
    const uniqueLeaseIds = [...new Set(allLeases.map((l) => l.id))];

    const results: ActiveLeaseSummary[] = [];

    for (const leaseId of uniqueLeaseIds) {
      const current = await this.prisma.leaseCurrentStatus.findUnique({
        where: { lease_id: leaseId },
        include: { status: true, history: true },
      });
      if (!current) continue;

      const lease = allLeases.find((l) => l.id === leaseId);
      if (!lease) continue;

      // Resolve property name via cross-schema lookup: portfolio_unit → property_id → listing title
      const listing = await this.prisma.listing.findFirst({
        where: { portfolio_unit_id: lease.portfolio_unit_id },
        select: { title: true },
      });

      results.push({
        leaseId,
        propertyName: listing?.title ?? lease.portfolio_unit.portfolio.name,
        currentState: current.status.name as LeaseState,
        lastChangedAt: current.history.record_created_at,
      });
    }

    return results;
  }

  async getLandlordUserId(leaseId: string): Promise<string | null> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId },
      select: { portfolio_unit_id: true },
    });
    if (!lease) return null;

    const unit = await this.prisma.portfolioUnit.findFirst({
      where: { id: lease.portfolio_unit_id },
      select: { portfolio_id: true },
    });
    if (!unit) return null;

    const portfolio = await this.prisma.landlordPortfolio.findFirst({
      where: { id: unit.portfolio_id },
      select: { user_id: true },
    });
    return portfolio?.user_id ?? null;
  }

  async getTenantUserId(leaseId: string): Promise<string | null> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId },
      select: { user_id: true },
    });
    return lease?.user_id ?? null;
  }
}
