import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/prisma/prisma.service';
import { EnrichedPortfolioUnitEntity } from '../../domain/entities/enriched-portfolio-unit.entity';
import { LandlordPortfolioEntity } from '../../domain/entities/landlord-portfolio.entity';
import { PortfolioUnitEntity } from '../../domain/entities/portfolio-unit.entity';
import {
  CreateEnrichedUnitData,
  CreatePortfolioData,
  CreatePortfolioUnitData,
  IPortfolioRepository,
  PortfolioWithStats,
  UpdatePortfolioData,
  UpdatePortfolioUnitData,
} from '../../domain/ports/portfolio-repository.port';

@Injectable()
export class PrismaPortfolioRepository implements IPortfolioRepository {
  constructor(private readonly prisma: PrismaService) { }

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
          payload: data as any,
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
            payload: { unitId, ...data.rawPayload } as any,
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

  async findPortfoliosByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ portfolios: PortfolioWithStats[]; total: number }> {
    const skip = (page - 1) * limit;

    const [portfolios, total] = await Promise.all([
      this.prisma.landlordPortfolio.findMany({
        where: { user_id: userId },
        skip,
        take: limit,
        orderBy: { creation_date: 'desc' },
        include: {
          units: {
            include: {
              leases: true,
            },
          },
        },
      }),
      this.prisma.landlordPortfolio.count({
        where: { user_id: userId },
      }),
    ]);

    const now = new Date();

    const portfolioStats: PortfolioWithStats[] = await Promise.all(
      portfolios.map(async (portfolio) => {
        const totalUnits = portfolio.units.length;

        let activeLeases = 0;
        let unitsWithActiveLease = 0;

        for (const unit of portfolio.units) {
          const unitActiveLeases = unit.leases.filter(
            (lease) => lease.deleted_at === null && (lease.end_date === null || lease.end_date > now),
          );
          activeLeases += unitActiveLeases.length;
          if (unitActiveLeases.length > 0) {
            unitsWithActiveLease++;
          }
        }

        const occupancyPercentage =
          totalUnits === 0 ? 0 : Math.round((unitsWithActiveLease / totalUnits) * 100);

        return {
          id: portfolio.id,
          name: portfolio.name,
          description: portfolio.description,
          creationDate: portfolio.creation_date,
          totalUnits,
          activeLeases,
          occupancyPercentage,
        };
      }),
    );

    return { portfolios: portfolioStats, total };
  }

  async getGlobalStats(userId: string): Promise<{ totalUnits: number; activeLeases: number }> {
    const now = new Date();

    const totalUnits = await this.prisma.portfolioUnit.count({
      where: {
        portfolio: {
          user_id: userId,
        },
      },
    });

    const activeLeases = await this.prisma.lease.count({
      where: {
        deleted_at: null,
        portfolio_unit: {
          portfolio: {
            user_id: userId,
          },
        },
        OR: [{ end_date: null }, { end_date: { gt: now } }],
      },
    });

    return { totalUnits, activeLeases };
  }

  async createPortfolio(data: CreatePortfolioData): Promise<LandlordPortfolioEntity> {
    const portfolio = await this.prisma.landlordPortfolio.create({
      data: {
        user_id: data.userId,
        name: data.name,
        description: data.description ?? null,
      },
    });

    return new LandlordPortfolioEntity(
      portfolio.id,
      portfolio.user_id,
      portfolio.name,
      portfolio.description,
      portfolio.creation_date,
    );
  }

  async findPortfolioById(portfolioId: string): Promise<LandlordPortfolioEntity | null> {
    const portfolio = await this.prisma.landlordPortfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) return null;

    return new LandlordPortfolioEntity(
      portfolio.id,
      portfolio.user_id,
      portfolio.name,
      portfolio.description,
      portfolio.creation_date,
    );
  }

  async createEnrichedUnit(data: CreateEnrichedUnitData): Promise<EnrichedPortfolioUnitEntity> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Property in property_listings schema
      const property = await tx.property.create({
        data: {
          property_type: data.propertyType,
          length: data.length ?? null,
          width: data.width ?? null,
          number_of_rooms: data.numberOfRooms,
          number_of_bathrooms: data.numberOfBathrooms,
          is_active: true,
        },
      });

      // Create Address in property_listings schema
      await tx.address.create({
        data: {
          property_id: property.id,
          address: data.address,
          state: data.departmentName,
          city: data.cityName,
          neighborhood: '',
        },
      });

      // Create PortfolioUnit in landlord_portfolio schema
      const unit = await tx.portfolioUnit.create({
        data: {
          name: data.name,
          portfolio_id: data.portfolioId,
          property_id: property.id,
          conditions: data.description ?? null,
          lease_base_amount: data.leaseBaseAmount,
          lease_base_currency: data.leaseBaseCurrency,
        },
      });

      // Create PortfolioRaw audit record
      await tx.portfolioRaw.create({
        data: {
          payload: data as any,
          processed: false,
        },
      });

      return { property, unit };
    });

    const { property, unit } = result;

    // Compute area = length × width if both present, else null
    const length = property.length ? Number(property.length) : null;
    const width = property.width ? Number(property.width) : null;
    const area = length !== null && width !== null ? length * width : null;

    const leaseAmount =
      typeof unit.lease_base_amount === 'object' && 'toNumber' in unit.lease_base_amount
        ? unit.lease_base_amount.toNumber()
        : Number(unit.lease_base_amount);

    return new EnrichedPortfolioUnitEntity(
      unit.id,
      unit.portfolio_id,
      unit.name,
      property.property_type,
      data.address,
      area,
      property.number_of_rooms,
      property.number_of_bathrooms,
      unit.conditions,
      leaseAmount,
      unit.lease_base_currency,
      data.departmentCode,
      data.cityCode,
      unit.created_at,
      unit.updated_at,
    );
  }

  async findPropertyTypeByCode(code: string): Promise<{ id: string; code: string } | null> {
    const pt = await this.prisma.propertyType.findUnique({ where: { code } });
    return pt ? { id: pt.id, code: pt.code } : null;
  }

  async findAllPropertyTypes(): Promise<{ id: string; code: string; description: string }[]> {
    const types = await this.prisma.propertyType.findMany({
      where: { is_active: true },
      orderBy: { code: 'asc' },
    });
    return types.map((t) => ({ id: t.id, code: t.code, description: t.description }));
  }

  async findAllDepartments(): Promise<{ id: string; code: string; name: string }[]> {
    const departments = await this.prisma.department.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    return departments.map((d) => ({ id: d.id, code: d.code, name: d.name }));
  }

  async findCitiesByDepartmentCode(departmentCode: string): Promise<{ id: string; code: string; departmentCode: string; name: string }[]> {
    const cities = await this.prisma.city.findMany({
      where: { department_code: departmentCode, is_active: true },
      orderBy: { name: 'asc' },
    });
    return cities.map((c) => ({ id: c.id, code: c.code, departmentCode: c.department_code, name: c.name }));
  }

  async findDepartmentByCode(code: string): Promise<{ id: string; code: string; name: string } | null> {
    const dept = await this.prisma.department.findUnique({ where: { code } });
    if (!dept || !dept.is_active) return null;
    return { id: dept.id, code: dept.code, name: dept.name };
  }

  async findCityByCode(code: string): Promise<{ id: string; code: string; departmentCode: string; name: string } | null> {
    const city = await this.prisma.city.findUnique({ where: { code } });
    if (!city || !city.is_active) return null;
    return { id: city.id, code: city.code, departmentCode: city.department_code, name: city.name };
  }

  async updatePortfolio(portfolioId: string, data: UpdatePortfolioData): Promise<LandlordPortfolioEntity> {
    const updated = await this.prisma.landlordPortfolio.update({
      where: { id: portfolioId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    return new LandlordPortfolioEntity(
      updated.id,
      updated.user_id,
      updated.name,
      updated.description,
      updated.creation_date,
    );
  }

  async deletePortfolio(portfolioId: string): Promise<void> {
    await this.prisma.landlordPortfolio.delete({ where: { id: portfolioId } });
  }

  async deleteUnit(unitId: string): Promise<void> {
    await this.prisma.portfolioUnit.delete({ where: { id: unitId } });
  }

  async countUnitsByPortfolioId(portfolioId: string): Promise<number> {
    return this.prisma.portfolioUnit.count({ where: { portfolio_id: portfolioId } });
  }

  async hasActiveLeases(unitId: string): Promise<boolean> {
    // Find leases for this unit, then check if any has an active current status
    const leases = await this.prisma.lease.findMany({
      where: { portfolio_unit_id: unitId, deleted_at: null },
      select: { id: true },
    });

    if (leases.length === 0) return false;

    // Check if any lease has a current status entry (meaning it's being tracked/active)
    const activeStatus = await this.prisma.leaseCurrentStatus.findFirst({
      where: {
        lease_id: { in: leases.map((l) => l.id) },
      },
    });

    return activeStatus !== null;
  }

  private toEntity(unit: {
    id: string;
    portfolio_id: string;
    property_id: string;
    name: string;
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
      unit.name,
      unit.conditions,
      amount,
      unit.lease_base_currency,
      unit.created_at,
      unit.updated_at,
    );
  }
}
