// Feature: backend-database-implementation, Property 13: Actualización de unidad de portafolio persiste cambios (round-trip)
// Validates: Requirements 2.4

import * as fc from 'fast-check';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdatePortfolioUnitUseCase } from './update-portfolio-unit.use-case';
import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import type { UpdatePortfolioUnitDto } from '@modules/landlord-portfolio/application/dtos/update-portfolio-unit.dto';
import { PortfolioUnitEntity } from '@modules/landlord-portfolio/domain/entities/portfolio-unit.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';

// ─── Arbitrary generators ────────────────────────────────────────────────────

function arbitraryPortfolioUnit(): fc.Arbitrary<PortfolioUnitEntity> {
  return fc.record({
    id: fc.uuid(),
    portfolioId: fc.uuid(),
    propertyId: fc.uuid(),
    conditions: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    leaseBaseAmount: fc.float({ min: 0, max: 10_000_000, noNaN: true }),
    leaseBaseCurrency: fc.constantFrom('COP', 'USD', 'EUR'),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  }).map(
    (r) =>
      new PortfolioUnitEntity(
        r.id,
        r.portfolioId,
        r.propertyId,
        r.conditions,
        r.leaseBaseAmount,
        r.leaseBaseCurrency,
        r.createdAt,
        r.updatedAt,
      ),
  );
}

function arbitraryUpdatePortfolioUnitDto(): fc.Arbitrary<UpdatePortfolioUnitDto> {
  return fc.record(
    {
      conditions: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
      leaseBaseAmount: fc.option(fc.float({ min: 0, max: 10_000_000, noNaN: true }), { nil: undefined }),
      leaseBaseCurrency: fc.option(fc.constantFrom('COP', 'USD', 'EUR'), { nil: undefined }),
    },
    { requiredKeys: [] },
  ) as fc.Arbitrary<UpdatePortfolioUnitDto>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMocks(unit: PortfolioUnitEntity, ownerId: string) {
  // Simulate in-memory state: updateUnit returns a new entity with updated fields
  const updateUnit = jest.fn().mockImplementation(
    (_unitId: string, data: Partial<UpdatePortfolioUnitDto & { rawPayload?: unknown }>) => {
      const updated = new PortfolioUnitEntity(
        unit.id,
        unit.portfolioId,
        unit.propertyId,
        data.conditions !== undefined ? (data.conditions ?? null) : unit.conditions,
        data.leaseBaseAmount !== undefined ? data.leaseBaseAmount! : unit.leaseBaseAmount,
        data.leaseBaseCurrency !== undefined ? data.leaseBaseCurrency! : unit.leaseBaseCurrency,
        unit.createdAt,
        new Date(),
      );
      return Promise.resolve(updated);
    },
  );

  const repo: jest.Mocked<IPortfolioRepository> = {
    findOrCreatePortfolio: jest.fn(),
    createUnit: jest.fn(),
    findUnitsByUserId: jest.fn(),
    findUnitById: jest.fn().mockResolvedValue(unit),
    updateUnit,
    getPortfolioOwnerUserId: jest.fn().mockResolvedValue(ownerId),
    findPortfoliosByUserId: jest.fn(),
    getGlobalStats: jest.fn(),
    createPortfolio: jest.fn(),
    findPortfolioById: jest.fn(),
    createEnrichedUnit: jest.fn(),
    findPropertyTypeByCode: jest.fn(),
    findAllPropertyTypes: jest.fn(),
  };

  const auditLogger = {
    log: jest.fn(),
  } as unknown as AuditLoggerService;

  return { repo, auditLogger };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdatePortfolioUnitUseCase — Property 13: round-trip update persists changes', () => {
  /**
   * Property 13: Actualización de unidad de portafolio persiste cambios (round-trip)
   * Validates: Requirements 2.4
   *
   * For any valid portfolio unit and any valid update DTO:
   *   1. execute() succeeds (does not throw) when the caller is the owner
   *   2. The returned DTO contains exactly the updated values from the input DTO
   *   3. The repository's updateUnit method was called with the correct unitId and data
   */
  it('Property 13 — execute succeeds and returns updated values for any valid input', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioUnit(),
        arbitraryUpdatePortfolioUnitDto(),
        async (unit, dto) => {
          const ownerId = unit.id; // use unit.id as owner to keep it unique per run
          const { repo, auditLogger } = buildMocks(unit, ownerId);
          const useCase = new UpdatePortfolioUnitUseCase(repo, auditLogger);

          const result = await useCase.execute(unit.id, dto, ownerId);

          // 1. Does not throw — we reach this line
          expect(result).toBeDefined();

          // 2. Returned DTO reflects updated values
          if (dto.conditions !== undefined) {
            expect(result.conditions).toBe(dto.conditions ?? null);
          }
          if (dto.leaseBaseAmount !== undefined) {
            expect(result.leaseBaseAmount).toBe(dto.leaseBaseAmount);
          }
          if (dto.leaseBaseCurrency !== undefined) {
            expect(result.leaseBaseCurrency).toBe(dto.leaseBaseCurrency);
          }

          // 3. Repository updateUnit was called with the correct unitId
          expect(repo.updateUnit).toHaveBeenCalledWith(
            unit.id,
            expect.objectContaining({ rawPayload: expect.any(Object) }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 13 — execute throws NotFoundException when unit does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // unitId
        fc.uuid(), // userId
        arbitraryUpdatePortfolioUnitDto(),
        async (unitId, userId, dto) => {
          const repo: jest.Mocked<IPortfolioRepository> = {
            findOrCreatePortfolio: jest.fn(),
            createUnit: jest.fn(),
            findUnitsByUserId: jest.fn(),
            findUnitById: jest.fn().mockResolvedValue(null),
            updateUnit: jest.fn(),
            getPortfolioOwnerUserId: jest.fn().mockResolvedValue(null),
            findPortfoliosByUserId: jest.fn(),
            getGlobalStats: jest.fn(),
            createPortfolio: jest.fn(),
            findPortfolioById: jest.fn(),
            createEnrichedUnit: jest.fn(),
            findPropertyTypeByCode: jest.fn(),
            findAllPropertyTypes: jest.fn(),
          };
          const auditLogger = { log: jest.fn() } as unknown as AuditLoggerService;
          const useCase = new UpdatePortfolioUnitUseCase(repo, auditLogger);

          await expect(useCase.execute(unitId, dto, userId)).rejects.toThrow(NotFoundException);
          expect(repo.updateUnit).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 13 — execute throws ForbiddenException and logs audit when caller is not the owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPortfolioUnit(),
        arbitraryUpdatePortfolioUnitDto(),
        fc.uuid(), // attacker userId — different from owner
        async (unit, dto, attackerId) => {
          // Ensure attacker is never the owner
          fc.pre(attackerId !== unit.id);

          const { repo, auditLogger } = buildMocks(unit, unit.id);
          const useCase = new UpdatePortfolioUnitUseCase(repo, auditLogger);

          await expect(useCase.execute(unit.id, dto, attackerId)).rejects.toThrow(ForbiddenException);
          expect(repo.updateUnit).not.toHaveBeenCalled();
          expect(auditLogger.log).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: attackerId,
              action: 'UNAUTHORIZED_PORTFOLIO_UNIT_UPDATE',
              resource: 'PortfolioUnit',
              resourceId: unit.id,
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
