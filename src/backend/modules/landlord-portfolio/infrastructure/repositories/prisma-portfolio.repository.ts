import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { PortfolioUnitEntity } from '../../domain/entities/portfolio-unit.entity';
import {
  CreatePortfolioUnitData,
  IPortfolioRepository,
  UpdatePortfolioUnitData,
} from '../../domain/ports/portfolio-repository.port';

@Injectable()
export class PrismaPortfolioRepository implements IPortfolioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreatePortfolio(userId: string): Promise<{ id: string }> {
    const existing = await this.prisma.landlordPortfolio.findFirst({
      where: { user_id: userId },
    });

    if (existing) {
      return { id: existing.id };
    }

    const created = await this.prisma.landlordPortfolio.create({
      data: {
        user_id: userId,
        name: 'Mi portafolio',
      },
    });

    return { id: created.id };
  }

  async createUnit(data: CreatePortfolioUnitData): Promise<PortfolioUnitEntity> {
    const unit = await this.prisma.$transaction(async (tx) => {
      const created = await tx.portfolioUnit.create({
        data: {
          portfolio_id: data.portfolioId,
          property_id: data.propertyId,
          conditions: data.conditions ?? null,
          lease_base_amount: data.leaseBaseAmount,
          lease_base_currency: data.leaseBaseCurrency,
        },
      });

      await tx.portfolioRaw.create({
        data: {
          payload: JSON.stringify(data),
          processed: false,
        },
      });

      return created;
    });

    return this.toEntity(unit);
  }

  async findUnitsByUserId(userId: string): Promise<PortfolioUnitEntity[]> {
    const units = await this.prisma.portfolioUnit.findMany({
      where: {
        portfolio: {
          user_id: userId,
        },
      },
      include: { portfolio: true },
    });

    return units.map((unit) => this.toEntity(unit));
  }

  async findUnitById(unitId: string): Promise<PortfolioUnitEntity | null> {
    const unit = await this.prisma.portfolioUnit.findUnique({
      where: { id: unitId },
    });

    return unit ? this.toEntity(unit) : null;
  }

  async updateUnit(unitId: string, data: UpdatePortfolioUnitData): Promise<PortfolioUnitEntity> {
    const updated = await this.prisma.$transaction(async (tx) => {
      if (data.rawPayload !== undefined) {
        await tx.portfolioRaw.create({
          data: {
            payload: JSON.stringify({ unitId, ...data.rawPayload }),
            processed: false,
          },
        });
      }

      return tx.portfolioUnit.update({
        where: { id: unitId },
        data: {
          ...(data.conditions !== undefined && { conditions: data.conditions }),
          ...(data.leaseBaseAmount !== undefined && { lease_base_amount: data.leaseBaseAmount }),
          ...(data.leaseBaseCurrency !== undefined && { lease_base_currency: data.leaseBaseCurrency }),
        },
      });
    });

    return this.toEntity(updated);
  }

  async getPortfolioOwnerUserId(unitId: string): Promise<string | null> {
    const unit = await this.prisma.portfolioUnit.findUnique({
      where: { id: unitId },
      include: { portfolio: true },
    });

    return unit?.portfolio.user_id ?? null;
  }

  private toEntity(unit: {
    id: string;
    portfolio_id: string;
    property_id: string;
    conditions: string | null;
    lease_base_amount: { toNumber(): number } | number;
    lease_base_currency: string;
    created_at: Date;
    updated_at: Date;
  }): PortfolioUnitEntity {
    const amount =
      typeof unit.lease_base_amount === 'object' && 'toNumber' in unit.lease_base_amount
        ? unit.lease_base_amount.toNumber()
        : (unit.lease_base_amount as number);

    return new PortfolioUnitEntity(
      unit.id,
      unit.portfolio_id,
      unit.property_id,
      unit.conditions,
      amount,
      unit.lease_base_currency,
      unit.created_at,
      unit.updated_at,
    );
  }
}
