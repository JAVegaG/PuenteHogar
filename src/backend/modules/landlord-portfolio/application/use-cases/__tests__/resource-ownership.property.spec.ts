// Feature: backend-database-implementation, Property 12: Resource ownership — usuario solo accede a sus propios recursos
// Validates: Requirements 2.3, 2.5, 3.12, 5.3, 5.11, 6.9, 8.3, 8.4, 11.2, 11.3

import * as fc from 'fast-check';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

// Mock PrismaService to avoid importing @prisma-generated/client in test environment
jest.mock('@src/shared/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    property: { findUnique: jest.fn().mockResolvedValue(null) },
  })),
}));

import { GetPortfolioUseCase } from '@modules/landlord-portfolio/application/use-cases/get-portfolio.use-case';
import { UpdatePortfolioUnitUseCase } from '@modules/landlord-portfolio/application/use-cases/update-portfolio-unit.use-case';
import { UnpublishListingUseCase } from '@modules/property-listings/application/use-cases/unpublish-listing.use-case';
import { GetContractSummaryUseCase } from '@modules/contracts/application/use-cases/get-contract-summary.use-case';
import { UploadContractUseCase } from '@modules/contracts/application/use-cases/upload-contract.use-case';
import { CreateContractDto } from '@modules/contracts/application/dtos/create-contract.dto';
import { GetPaymentHistoryUseCase } from '@modules/payments/application/use-cases/get-payment-history.use-case';
import { GetLeaseStatusUseCase } from '@modules/rental-tracking/application/use-cases/get-lease-status.use-case';

import type { IPortfolioRepository } from '@modules/landlord-portfolio/domain/ports/portfolio-repository.port';
import type { IListingRepository } from '@modules/property-listings/domain/ports/listing-repository.port';
import type { IListingCache } from '@modules/property-listings/domain/ports/listing-cache.port';
import type { IContractRepository } from '@modules/contracts/domain/ports/contract-repository.port';
import type { IObjectStorage } from '@modules/contracts/domain/ports/object-storage.port';
import type { INotificationPort } from '@modules/contracts/domain/ports/notification.port';
import type { IPaymentRepository } from '@modules/payments/domain/ports/payment-repository.port';
import type { ITrackingRepository } from '@modules/rental-tracking/domain/ports/tracking-repository.port';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';

// ─── Generators ───────────────────────────────────────────────────────────────

/** Two distinct UUIDs guaranteed to be different */
const arbitraryTwoDistinctUuids = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([a, b]) => a !== b);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAuditLogger(): AuditLoggerService {
  return { log: jest.fn(), logFailedLogin: jest.fn() } as unknown as AuditLoggerService;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 12: Resource ownership — usuario solo accede a sus propios recursos', () => {

  // ── 2.3 / 2.5: Portfolio ────────────────────────────────────────────────────

  describe('Portfolio — GetPortfolioUseCase (Req 2.3)', () => {
    /**
     * GetPortfolioUseCase filters by userId at the repository level.
     * For any userId, the use case must return only units belonging to that user.
     * We verify that the repository is called with exactly the requesting userId.
     */
    it('Property 12 — GetPortfolio only queries units for the requesting user', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const mockRepo: jest.Mocked<IPortfolioRepository> = {
            findUnitsByUserId: jest.fn().mockResolvedValue([]),
            findOrCreatePortfolio: jest.fn(),
            createUnit: jest.fn(),
            findUnitById: jest.fn(),
            updateUnit: jest.fn(),
            getPortfolioOwnerUserId: jest.fn(),
            findPortfoliosByUserId: jest.fn(),
            getGlobalStats: jest.fn(),
            createPortfolio: jest.fn(),
            findPortfolioById: jest.fn(),
            createEnrichedUnit: jest.fn(),
            findPropertyTypeByCode: jest.fn(),
            findAllPropertyTypes: jest.fn(),
            findAllDepartments: jest.fn(),
            findCitiesByDepartmentCode: jest.fn(),
            findDepartmentByCode: jest.fn(),
            findCityByCode: jest.fn(),
            updatePortfolio: jest.fn(),
            deletePortfolio: jest.fn(),
            deleteUnit: jest.fn(),
            countUnitsByPortfolioId: jest.fn(),
            hasActiveLeases: jest.fn(),
          };

          const mockPrisma = {
            property: { findUnique: jest.fn().mockResolvedValue(null) },
          } as any;

          const useCase = new GetPortfolioUseCase(mockRepo, mockPrisma);
          await useCase.execute(userId);

          // Repository must be called with exactly the requesting userId
          expect(mockRepo.findUnitsByUserId).toHaveBeenCalledWith(userId);
          expect(mockRepo.findUnitsByUserId).toHaveBeenCalledTimes(1);
          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Portfolio — UpdatePortfolioUnitUseCase (Req 2.5)', () => {
    /**
     * When a user tries to update a portfolio unit that belongs to a different user,
     * the use case must throw ForbiddenException (403) and log the attempt.
     */
    it('Property 12 — UpdatePortfolioUnit throws 403 when userId !== ownerUserId', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTwoDistinctUuids, fc.uuid(), async ([requestingUserId, ownerUserId], unitId) => {
          const mockRepo: jest.Mocked<IPortfolioRepository> = {
            getPortfolioOwnerUserId: jest.fn().mockResolvedValue(ownerUserId),
            findOrCreatePortfolio: jest.fn(),
            createUnit: jest.fn(),
            findUnitsByUserId: jest.fn(),
            findUnitById: jest.fn(),
            updateUnit: jest.fn(),
            findPortfoliosByUserId: jest.fn(),
            getGlobalStats: jest.fn(),
            createPortfolio: jest.fn(),
            findPortfolioById: jest.fn(),
            createEnrichedUnit: jest.fn(),
            findPropertyTypeByCode: jest.fn(),
            findAllPropertyTypes: jest.fn(),
            findAllDepartments: jest.fn(),
            findCitiesByDepartmentCode: jest.fn(),
            findDepartmentByCode: jest.fn(),
            findCityByCode: jest.fn(),
            updatePortfolio: jest.fn(),
            deletePortfolio: jest.fn(),
            deleteUnit: jest.fn(),
            countUnitsByPortfolioId: jest.fn(),
            hasActiveLeases: jest.fn(),
          };
          const auditLogger = makeAuditLogger();

          const useCase = new UpdatePortfolioUnitUseCase(mockRepo, auditLogger);

          let threw = false;
          try {
            await useCase.execute(unitId, {}, requestingUserId);
          } catch (e) {
            threw = e instanceof ForbiddenException;
          }

          // Must throw 403 and log the unauthorized attempt
          const logSpy = auditLogger.log as jest.Mock;
          return threw && logSpy.mock.calls.length > 0;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * When the unit does not exist, the use case must throw NotFoundException (404).
     */
    it('Property 12 — UpdatePortfolioUnit throws 404 when unit does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (requestingUserId, unitId) => {
          const mockRepo: jest.Mocked<IPortfolioRepository> = {
            getPortfolioOwnerUserId: jest.fn().mockResolvedValue(null),
            findOrCreatePortfolio: jest.fn(),
            createUnit: jest.fn(),
            findUnitsByUserId: jest.fn(),
            findUnitById: jest.fn(),
            updateUnit: jest.fn(),
            findPortfoliosByUserId: jest.fn(),
            getGlobalStats: jest.fn(),
            createPortfolio: jest.fn(),
            findPortfolioById: jest.fn(),
            createEnrichedUnit: jest.fn(),
            findPropertyTypeByCode: jest.fn(),
            findAllPropertyTypes: jest.fn(),
            findAllDepartments: jest.fn(),
            findCitiesByDepartmentCode: jest.fn(),
            findDepartmentByCode: jest.fn(),
            findCityByCode: jest.fn(),
            updatePortfolio: jest.fn(),
            deletePortfolio: jest.fn(),
            deleteUnit: jest.fn(),
            countUnitsByPortfolioId: jest.fn(),
            hasActiveLeases: jest.fn(),
          };
          const auditLogger = makeAuditLogger();

          const useCase = new UpdatePortfolioUnitUseCase(mockRepo, auditLogger);

          let threw = false;
          try {
            await useCase.execute(unitId, {}, requestingUserId);
          } catch (e) {
            threw = e instanceof NotFoundException;
          }
          return threw;
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── 3.12: Listings ──────────────────────────────────────────────────────────

  describe('Listings — UnpublishListingUseCase (Req 3.12)', () => {
    /**
     * When a user tries to unpublish a listing that belongs to a different user,
     * the use case must throw ForbiddenException (403).
     */
    it('Property 12 — UnpublishListing throws 403 when userId !== ownerUserId', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTwoDistinctUuids, fc.uuid(), async ([requestingUserId, ownerUserId], listingId) => {
          const mockRepo: jest.Mocked<IListingRepository> = {
            getOwnerUserId: jest.fn().mockResolvedValue(ownerUserId),
            getOwnerUserIdByUnit: jest.fn(),
            create: jest.fn(),
            findPublished: jest.fn(),
            findById: jest.fn(),
            findDetailById: jest.fn(),
            findActiveByPortfolioUnitId: jest.fn(),
            update: jest.fn(),
            unpublish: jest.fn(),
            registerContactEvent: jest.fn(),
          };
          const mockCache: jest.Mocked<IListingCache> = {
            getListings: jest.fn(),
            setListings: jest.fn(),
            invalidate: jest.fn(),
            invalidateByPattern: jest.fn().mockResolvedValue(undefined),
          };

          const useCase = new UnpublishListingUseCase(mockRepo, mockCache);

          let threw = false;
          try {
            await useCase.execute(listingId, requestingUserId);
          } catch (e) {
            threw = e instanceof ForbiddenException;
          }
          return threw;
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── 5.3 / 5.11: Contracts ───────────────────────────────────────────────────

  describe('Contracts — UploadContractUseCase (Req 5.3)', () => {
    /**
     * When a landlord tries to upload a contract to a lease that belongs to a
     * different landlord, the use case must throw ForbiddenException (403).
     */
    it('Property 12 — UploadContract throws 403 when landlord is not the lease owner', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTwoDistinctUuids, fc.uuid(), async ([requestingUserId, leaseOwnerUserId], leaseId) => {
          const mockRepo: jest.Mocked<IContractRepository> = {
            getLeaseOwnerUserId: jest.fn().mockResolvedValue(leaseOwnerUserId),
            getLeaseTenantUserId: jest.fn().mockResolvedValue('tenant-id'),
            create: jest.fn(),
            findById: jest.fn(),
            findByLeaseId: jest.fn(),
            updateStatus: jest.fn(),
            findContractParties: jest.fn(),
            findContractStatusByName: jest.fn(),
            findFileTypeByName: jest.fn(),
            findFileStatusByName: jest.fn(),
            findContractsByLandlordId: jest.fn(),
            findContractsByTenantId: jest.fn(),
            updateFileUrl: jest.fn(),
            deleteContract: jest.fn(),
            findSigningsByContractId: jest.fn(),
            getLeaseMonthlyAmount: jest.fn(),
          };
          const mockObjectStorage: IObjectStorage = {
            uploadFile: jest.fn(),
            getPresignedUrl: jest.fn(),
          };
          const auditLogger = makeAuditLogger();

          const useCase = new UploadContractUseCase(mockRepo, mockObjectStorage, {
            notifyContractSigned: jest.fn(),
            notifySigningFailed: jest.fn(),
            notifyContractUploaded: jest.fn(),
          } as INotificationPort, auditLogger);

          let threw = false;
          try {
            await useCase.execute(
              { buffer: Buffer.from('fake-pdf'), originalname: 'contract.pdf', size: 1024, mimetype: 'application/pdf' },
              { leaseId, startDate: '2024-01-01' } as CreateContractDto,
              requestingUserId,
              ['LANDLORD'],
            );
          } catch (e) {
            threw = e instanceof ForbiddenException;
          }
          return threw;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Contracts — GetContractSummaryUseCase (Req 5.11)', () => {
    /**
     * When a user who is not a party to the contract tries to access it,
     * the use case must throw ForbiddenException (403).
     */
    it('Property 12 — GetContractSummary throws 403 when user is not a contract party', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryTwoDistinctUuids,
          fc.uuid(),
          fc.uuid(),
          async ([landlordId, tenantId], requestingUserId, contractId) => {
            // requestingUserId is different from both landlordId and tenantId
            // (guaranteed by the two-distinct filter + separate uuid)
            // We need to ensure requestingUserId is not landlordId or tenantId
            if (requestingUserId === landlordId || requestingUserId === tenantId) {
              return true; // skip this case
            }

            const mockRepo: jest.Mocked<IContractRepository> = {
              findById: jest.fn().mockResolvedValue({
                id: contractId,
                leaseId: 'lease-1',
                status: 'PENDING',
                startDate: new Date(),
                endDate: undefined,
                fileUrl: 'https://example.com/contract.pdf',
                signedAt: undefined,
                externalSigningId: undefined,
              }),
              findContractParties: jest.fn().mockResolvedValue([
                { id: 'party-1', userId: landlordId, contractId, roleInContract: 'LANDLORD' },
                { id: 'party-2', userId: tenantId, contractId, roleInContract: 'TENANT' },
              ]),
              create: jest.fn(),
              findByLeaseId: jest.fn(),
              updateStatus: jest.fn(),
              getLeaseOwnerUserId: jest.fn(),
              getLeaseTenantUserId: jest.fn(),
              findContractStatusByName: jest.fn(),
              findFileTypeByName: jest.fn(),
              findFileStatusByName: jest.fn(),
              findContractsByLandlordId: jest.fn(),
              findContractsByTenantId: jest.fn(),
              updateFileUrl: jest.fn(),
              deleteContract: jest.fn(),
              findSigningsByContractId: jest.fn().mockResolvedValue([]),
              getLeaseMonthlyAmount: jest.fn(),
            };

            const mockObjectStorage: IObjectStorage = {
              uploadFile: jest.fn(),
              getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/test'),
            };

            const useCase = new GetContractSummaryUseCase(mockRepo, mockObjectStorage, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

            let threw = false;
            try {
              await useCase.execute(contractId, requestingUserId);
            } catch (e) {
              threw = e instanceof ForbiddenException;
            }
            return threw;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When a legitimate party (landlord or tenant) accesses the contract,
     * the use case must succeed (no 403).
     */
    it('Property 12 — GetContractSummary succeeds for landlord or tenant party', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.constantFrom('LANDLORD', 'TENANT'),
          async (landlordId, tenantId, contractId, requestingRole) => {
            const requestingUserId = requestingRole === 'LANDLORD' ? landlordId : tenantId;

            const mockRepo: jest.Mocked<IContractRepository> = {
              findById: jest.fn().mockResolvedValue({
                id: contractId,
                leaseId: 'lease-1',
                status: 'PENDING',
                startDate: new Date(),
                endDate: undefined,
                fileUrl: 'https://example.com/contract.pdf',
                signedAt: undefined,
                externalSigningId: undefined,
              }),
              findContractParties: jest.fn().mockResolvedValue([
                { id: 'party-1', userId: landlordId, contractId, roleInContract: 'LANDLORD' },
                { id: 'party-2', userId: tenantId, contractId, roleInContract: 'TENANT' },
              ]),
              create: jest.fn(),
              findByLeaseId: jest.fn(),
              updateStatus: jest.fn(),
              getLeaseOwnerUserId: jest.fn(),
              getLeaseTenantUserId: jest.fn(),
              findContractStatusByName: jest.fn(),
              findFileTypeByName: jest.fn(),
              findFileStatusByName: jest.fn(),
              findContractsByLandlordId: jest.fn(),
              findContractsByTenantId: jest.fn(),
              updateFileUrl: jest.fn(),
              deleteContract: jest.fn(),
              findSigningsByContractId: jest.fn().mockResolvedValue([]),
              getLeaseMonthlyAmount: jest.fn(),
            };

            const mockObjectStorage2: IObjectStorage = {
              uploadFile: jest.fn(),
              getPresignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/test'),
            };

            const useCase = new GetContractSummaryUseCase(mockRepo, mockObjectStorage2, { naturalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) }, legalPersonDetail: { findUnique: jest.fn().mockResolvedValue(null) } } as any);

            let succeeded = false;
            try {
              await useCase.execute(contractId, requestingUserId);
              succeeded = true;
            } catch {
              succeeded = false;
            }
            return succeeded;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 6.9: Payments ───────────────────────────────────────────────────────────

  describe('Payments — GetPaymentHistoryUseCase (Req 6.9)', () => {
    /**
     * GetPaymentHistoryUseCase filters by userId at the repository level.
     * The repository must be called with exactly the requesting userId,
     * ensuring a tenant cannot access another tenant's payment history.
     */
    it('Property 12 — GetPaymentHistory only queries payments for the requesting user', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const mockRepo: jest.Mocked<IPaymentRepository> = {
            getPaymentHistoryForUser: jest.fn().mockResolvedValue([]),
            persistRawEvent: jest.fn(),
            findScheduledPaymentById: jest.fn(),
            findScheduledPaymentsByLeaseId: jest.fn(),
            findPaymentByIdempotencyKey: jest.fn(),
            createPayment: jest.fn(),
            updateScheduledPaymentStatus: jest.fn(),
            logPaymentEvent: jest.fn(),
            getLeaseUserIds: jest.fn(),
            findPaymentStatusByName: jest.fn(),
          };

          const useCase = new GetPaymentHistoryUseCase(mockRepo);
          await useCase.execute(userId);

          // Repository must be called with exactly the requesting userId
          expect(mockRepo.getPaymentHistoryForUser).toHaveBeenCalledWith(userId);
          expect(mockRepo.getPaymentHistoryForUser).toHaveBeenCalledTimes(1);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For two distinct users, the payment history queries must use different userIds,
     * ensuring isolation between tenants.
     */
    it('Property 12 — GetPaymentHistory uses different userId for different users (isolation)', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryTwoDistinctUuids, async ([userA, userB]) => {
          const callLog: string[] = [];

          const makeRepo = (): jest.Mocked<IPaymentRepository> => ({
            getPaymentHistoryForUser: jest.fn().mockImplementation((uid: string) => {
              callLog.push(uid);
              return Promise.resolve([]);
            }),
            persistRawEvent: jest.fn(),
            findScheduledPaymentById: jest.fn(),
            findScheduledPaymentsByLeaseId: jest.fn(),
            findPaymentByIdempotencyKey: jest.fn(),
            createPayment: jest.fn(),
            updateScheduledPaymentStatus: jest.fn(),
            logPaymentEvent: jest.fn(),
            getLeaseUserIds: jest.fn(),
            findPaymentStatusByName: jest.fn(),
          });

          const repoA = makeRepo();
          const repoB = makeRepo();

          await new GetPaymentHistoryUseCase(repoA).execute(userA);
          await new GetPaymentHistoryUseCase(repoB).execute(userB);

          // Each use case must query with its own userId, never the other's
          expect(repoA.getPaymentHistoryForUser).toHaveBeenCalledWith(userA);
          expect(repoA.getPaymentHistoryForUser).not.toHaveBeenCalledWith(userB);
          expect(repoB.getPaymentHistoryForUser).toHaveBeenCalledWith(userB);
          expect(repoB.getPaymentHistoryForUser).not.toHaveBeenCalledWith(userA);
          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── 8.3 / 8.4: Rental Tracking ──────────────────────────────────────────────

  describe('Rental Tracking — GetLeaseStatusUseCase (Req 8.3, 8.4)', () => {
    /**
     * When a user who is neither the landlord nor the tenant of a lease tries to
     * query its status, the use case must throw ForbiddenException (403).
     */
    it('Property 12 — GetLeaseStatus throws 403 when user is not landlord or tenant', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryTwoDistinctUuids,
          fc.uuid(),
          fc.uuid(),
          async ([landlordId, tenantId], requestingUserId, leaseId) => {
            // Ensure requestingUserId is not landlord or tenant
            if (requestingUserId === landlordId || requestingUserId === tenantId) {
              return true; // skip
            }

            const mockRepo: jest.Mocked<ITrackingRepository> = {
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn(),
              getStatusHistory: jest.fn(),
              recordTransition: jest.fn(),
              getActiveLeasesForUser: jest.fn(),
              findLeaseIdByListingId: jest.fn(),
              getTenantContactInfo: jest.fn().mockResolvedValue(null),
            };

            const useCase = new GetLeaseStatusUseCase(mockRepo);

            let threw = false;
            try {
              await useCase.execute(leaseId, requestingUserId);
            } catch (e) {
              threw = e instanceof ForbiddenException;
            }
            return threw;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When the landlord queries the lease status, the use case must succeed.
     */
    it('Property 12 — GetLeaseStatus succeeds for the landlord of the lease', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (landlordId, tenantId, leaseId) => {
            const mockRepo: jest.Mocked<ITrackingRepository> = {
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue({
                leaseId,
                state: 'PUBLISHED',
                lastChangedAt: new Date(),
              }),
              getStatusHistory: jest.fn().mockResolvedValue([]),
              recordTransition: jest.fn(),
              getActiveLeasesForUser: jest.fn(),
              findLeaseIdByListingId: jest.fn(),
              getTenantContactInfo: jest.fn().mockResolvedValue(null),
            };

            const useCase = new GetLeaseStatusUseCase(mockRepo);

            let succeeded = false;
            try {
              await useCase.execute(leaseId, landlordId);
              succeeded = true;
            } catch {
              succeeded = false;
            }
            return succeeded;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When the tenant queries the lease status, the use case must succeed.
     */
    it('Property 12 — GetLeaseStatus succeeds for the tenant of the lease', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (landlordId, tenantId, leaseId) => {
            const mockRepo: jest.Mocked<ITrackingRepository> = {
              getLandlordUserId: jest.fn().mockResolvedValue(landlordId),
              getTenantUserId: jest.fn().mockResolvedValue(tenantId),
              getCurrentStatus: jest.fn().mockResolvedValue({
                leaseId,
                state: 'CONTACT_INITIATED',
                lastChangedAt: new Date(),
              }),
              getStatusHistory: jest.fn().mockResolvedValue([]),
              recordTransition: jest.fn(),
              getActiveLeasesForUser: jest.fn(),
              findLeaseIdByListingId: jest.fn(),
              getTenantContactInfo: jest.fn().mockResolvedValue(null),
            };

            const useCase = new GetLeaseStatusUseCase(mockRepo);

            let succeeded = false;
            try {
              await useCase.execute(leaseId, tenantId);
              succeeded = true;
            } catch {
              succeeded = false;
            }
            return succeeded;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When the lease does not exist, the use case must throw NotFoundException (404),
     * not leak information about other users' leases.
     */
    it('Property 12 — GetLeaseStatus throws 404 when lease does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (requestingUserId, leaseId) => {
          const mockRepo: jest.Mocked<ITrackingRepository> = {
            getLandlordUserId: jest.fn().mockResolvedValue(null),
            getTenantUserId: jest.fn().mockResolvedValue(null),
            getCurrentStatus: jest.fn(),
            getStatusHistory: jest.fn(),
            recordTransition: jest.fn(),
            getActiveLeasesForUser: jest.fn(),
            findLeaseIdByListingId: jest.fn(),
              getTenantContactInfo: jest.fn().mockResolvedValue(null),
          };

          const useCase = new GetLeaseStatusUseCase(mockRepo);

          let threw = false;
          try {
            await useCase.execute(leaseId, requestingUserId);
          } catch (e) {
            threw = e instanceof NotFoundException;
          }
          return threw;
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── 11.2 / 11.3: Cross-cutting ownership invariant ──────────────────────────

  describe('Cross-cutting — ownership check on every operation (Req 11.2, 11.3)', () => {
    /**
     * For any pair of distinct user IDs, attempting to access a resource owned by
     * one user as the other must always result in ForbiddenException.
     * This verifies the invariant across portfolio and listing domains.
     */
    it('Property 12 — ownership check is enforced for portfolio and listing in all cases', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryTwoDistinctUuids,
          fc.uuid(),
          fc.uuid(),
          async ([requestingUserId, ownerUserId], unitId, listingId) => {
            // Portfolio: UpdatePortfolioUnitUseCase
            const portfolioRepo: jest.Mocked<IPortfolioRepository> = {
              getPortfolioOwnerUserId: jest.fn().mockResolvedValue(ownerUserId),
              findOrCreatePortfolio: jest.fn(),
              createUnit: jest.fn(),
              findUnitsByUserId: jest.fn(),
              findUnitById: jest.fn(),
              updateUnit: jest.fn(),
              findPortfoliosByUserId: jest.fn(),
              getGlobalStats: jest.fn(),
              createPortfolio: jest.fn(),
              findPortfolioById: jest.fn(),
              createEnrichedUnit: jest.fn(),
              findPropertyTypeByCode: jest.fn(),
              findAllPropertyTypes: jest.fn(),
              findAllDepartments: jest.fn(),
              findCitiesByDepartmentCode: jest.fn(),
              findDepartmentByCode: jest.fn(),
              findCityByCode: jest.fn(),
              updatePortfolio: jest.fn(),
              deletePortfolio: jest.fn(),
              deleteUnit: jest.fn(),
              countUnitsByPortfolioId: jest.fn(),
              hasActiveLeases: jest.fn(),
            };
            const auditLogger = makeAuditLogger();
            const portfolioUseCase = new UpdatePortfolioUnitUseCase(portfolioRepo, auditLogger);

            let portfolioThrew = false;
            try {
              await portfolioUseCase.execute(unitId, {}, requestingUserId);
            } catch (e) {
              portfolioThrew = e instanceof ForbiddenException;
            }

            // Listing: UnpublishListingUseCase
            const listingRepo: jest.Mocked<IListingRepository> = {
              getOwnerUserId: jest.fn().mockResolvedValue(ownerUserId),
              getOwnerUserIdByUnit: jest.fn(),
              create: jest.fn(),
              findPublished: jest.fn(),
              findById: jest.fn(),
              findDetailById: jest.fn(),
              findActiveByPortfolioUnitId: jest.fn(),
              update: jest.fn(),
              unpublish: jest.fn(),
              registerContactEvent: jest.fn(),
            };
            const listingCache: jest.Mocked<IListingCache> = {
              getListings: jest.fn(),
              setListings: jest.fn(),
              invalidate: jest.fn(),
              invalidateByPattern: jest.fn().mockResolvedValue(undefined),
            };
            const listingUseCase = new UnpublishListingUseCase(listingRepo, listingCache);

            let listingThrew = false;
            try {
              await listingUseCase.execute(listingId, requestingUserId);
            } catch (e) {
              listingThrew = e instanceof ForbiddenException;
            }

            return portfolioThrew && listingThrew;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
