// Feature: backend-database-implementation, Property 15: ETL round-trip — contenido curado es equivalente al RAW original
// Validates: Requirements 2.7, 10.2, 10.3, 10.6

import * as fc from 'fast-check';

// Mock PrismaService to avoid real DB connection and @prisma-generated/client resolution
jest.mock('@src/shared/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { UsersEtlService } from '@modules/users/infrastructure/etl/users-etl.service';
import { PropertyListingsEtlService } from '@modules/property-listings/infrastructure/etl/property-listings-etl.service';
import { LandlordPortfolioEtlService } from '@modules/landlord-portfolio/infrastructure/etl/landlord-portfolio-etl.service';
import { PaymentsEtlService } from '@modules/payments/infrastructure/etl/payments-etl.service';
import { ContractsEtlService } from '@modules/contracts/infrastructure/etl/contracts-etl.service';
import { RentalTrackingEtlService } from '@modules/rental-tracking/infrastructure/etl/rental-tracking-etl.service';
import { NotificationsEtlService } from '@modules/notifications/infrastructure/etl/notifications-etl.service';
import { AccountingEtlService } from '@modules/accounting/infrastructure/etl/accounting-etl.service';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const MIN_TS = new Date('2020-01-01T00:00:00Z').getTime();
const MAX_TS = new Date('2030-12-31T23:59:59Z').getTime();

/** Safe ISO date string generator using integer timestamps */
function arbitraryISODate(): fc.Arbitrary<string> {
  return fc.integer({ min: MIN_TS, max: MAX_TS }).map((ts) => new Date(ts).toISOString());
}

/** Hex string generator (replacement for fc.hexaString which was removed in v4) */
function hexString(opts: { minLength: number; maxLength: number }): fc.Arbitrary<string> {
  return fc.stringMatching(new RegExp(`^[0-9a-f]{${opts.minLength},${opts.maxLength}}$`));
}

function nonEmptyString(maxLength = 50): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength }).filter((s) => s.trim().length > 0);
}

function positiveAmount(): fc.Arbitrary<number> {
  return fc.integer({ min: 100, max: 50_000_000 });
}

// ─── Arbitrary generators: arbitraryRawPayload() per module ──────────────────

function arbitraryUsersRawPayload() {
  return fc.record({
    mail: fc.emailAddress(),
    hashedPassword: hexString({ minLength: 60, maxLength: 60 }),
    userType: fc.constantFrom('LANDLORD', 'TENANT'),
    documentTypeId: fc.uuid(),
    documentNumber: fc.stringMatching(/^[0-9]{6,12}$/),
    phoneNumber: fc.stringMatching(/^[0-9]{10}$/),
    roleId: fc.uuid(),
    personType: fc.constantFrom('natural' as const, 'legal' as const),
    naturalDetails: fc.option(
      fc.record({
        firstName: nonEmptyString(),
        lastName: nonEmptyString(),
        preferredName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      }),
      { nil: undefined },
    ),
    legalDetails: fc.option(
      fc.record({ businessName: nonEmptyString(100) }),
      { nil: undefined },
    ),
  }).map((p) => {
    if (p.personType === 'natural') {
      return {
        ...p,
        naturalDetails: p.naturalDetails ?? { firstName: 'John', lastName: 'Doe' },
        legalDetails: undefined,
      };
    }
    return {
      ...p,
      naturalDetails: undefined,
      legalDetails: p.legalDetails ?? { businessName: 'ACME Corp' },
    };
  });
}

function arbitraryPropertyListingsRawPayload() {
  return fc.record({
    propertyType: fc.constantFrom('APARTMENT', 'HOUSE', 'STUDIO', 'ROOM'),
    length: fc.option(fc.integer({ min: 1, max: 500 }), { nil: undefined }),
    width: fc.option(fc.integer({ min: 1, max: 500 }), { nil: undefined }),
    numberOfBathrooms: fc.integer({ min: 1, max: 10 }),
    numberOfRooms: fc.integer({ min: 1, max: 20 }),
    address: fc.record({
      state: nonEmptyString(),
      city: nonEmptyString(),
      neighborhood: nonEmptyString(),
      address: nonEmptyString(100),
      latitude: fc.option(fc.integer({ min: -90, max: 90 }), { nil: undefined }),
      longitude: fc.option(fc.integer({ min: -180, max: 180 }), { nil: undefined }),
    }),
    listing: fc.record({
      portfolioUnitId: fc.uuid(),
      title: nonEmptyString(100),
      description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
      price: positiveAmount(),
      currency: fc.option(fc.constantFrom('COP', 'USD'), { nil: undefined }),
    }),
    photos: fc.array(
      fc.record({
        fileUrl: fc.webUrl(),
        isMain: fc.option(fc.boolean(), { nil: undefined }),
        txHash: fc.option(hexString({ minLength: 64, maxLength: 64 }), { nil: undefined }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
    additionalFeatures: fc.option(
      fc.array(
        fc.record({
          additionalFeatureId: fc.uuid(),
          value: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          order: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
        }),
        { minLength: 0, maxLength: 3 },
      ),
      { nil: undefined },
    ),
  });
}

function arbitraryPortfolioRawPayload() {
  return fc.record({
    userId: fc.uuid(),
    name: nonEmptyString(100),
    units: fc.option(
      fc.array(
        fc.record({
          propertyId: fc.uuid(),
          conditions: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          leaseBaseAmount: positiveAmount(),
          leaseBaseCurrency: fc.option(fc.constantFrom('COP', 'USD'), { nil: undefined }),
          lease: fc.option(
            fc.record({
              portfolioUnitId: fc.uuid(),
              userId: fc.uuid(),
              startDate: arbitraryISODate(),
              endDate: fc.option(arbitraryISODate(), { nil: undefined }),
              encBlob: fc.option(hexString({ minLength: 10, maxLength: 100 }), { nil: undefined }),
            }),
            { nil: undefined },
          ),
        }),
        { minLength: 0, maxLength: 3 },
      ),
      { nil: undefined },
    ),
  });
}

function arbitraryPaymentsRawPayload() {
  return fc.record({
    leaseId: fc.uuid(),
    amount: positiveAmount(),
    currency: fc.option(fc.constantFrom('COP', 'USD'), { nil: undefined }),
    dueDate: arbitraryISODate(),
    payment: fc.option(
      fc.record({
        scheduledPaymentId: fc.uuid(),
        amount: positiveAmount(),
        currency: fc.option(fc.constantFrom('COP', 'USD'), { nil: undefined }),
        paymentDesc: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        logs: fc.option(
          fc.array(
            fc.record({
              paymentStatusId: fc.uuid(),
              status: fc.constantFrom('PENDING', 'PROCESSING', 'PAID', 'REJECTED'),
              platform: fc.option(fc.constantFrom('PSE', 'CARD', 'CASH'), { nil: undefined }),
              data: fc.option(fc.record({ ref: fc.uuid() }), { nil: undefined }),
            }),
            { minLength: 0, maxLength: 3 },
          ),
          { nil: undefined },
        ),
      }),
      { nil: undefined },
    ),
  });
}

function arbitraryContractsRawPayload() {
  return fc.record({
    leaseId: fc.uuid(),
    contractStatusId: fc.uuid(),
    startDate: arbitraryISODate(),
    endDate: fc.option(arbitraryISODate(), { nil: undefined }),
    parties: fc.array(
      fc.record({
        userId: fc.uuid(),
        roleInContract: fc.constantFrom('LANDLORD', 'TENANT'),
      }),
      { minLength: 1, maxLength: 3 },
    ),
    files: fc.option(
      fc.array(
        fc.record({
          fileTypeId: fc.uuid(),
          fileStatusId: fc.uuid(),
          fileUrl: fc.webUrl(),
        }),
        { minLength: 0, maxLength: 3 },
      ),
      { nil: undefined },
    ),
    signings: fc.option(
      fc.array(
        fc.record({
          contractPartyIndex: fc.constant(0),
          signingStatusId: fc.uuid(),
          signingTimestamp: fc.option(arbitraryISODate(), { nil: undefined }),
          documentHash: fc.option(hexString({ minLength: 64, maxLength: 64 }), { nil: undefined }),
          logs: fc.option(
            fc.array(
              fc.record({
                signingStatusId: fc.uuid(),
                platform: fc.option(fc.constantFrom('DOCUSIGN', 'SIGNIO'), { nil: undefined }),
                data: fc.option(fc.record({ ref: fc.uuid() }), { nil: undefined }),
              }),
              { minLength: 0, maxLength: 2 },
            ),
            { nil: undefined },
          ),
        }),
        { minLength: 0, maxLength: 2 },
      ),
      { nil: undefined },
    ),
  });
}

function arbitraryTrackingRawPayload() {
  return fc.oneof(
    fc.record({
      leaseStatusHistory: fc.record({
        leaseId: fc.uuid(),
        leaseStatusId: fc.uuid(),
        isCurrent: fc.option(fc.boolean(), { nil: undefined }),
      }),
      listingStatusHistory: fc.constant(undefined),
    }),
    fc.record({
      leaseStatusHistory: fc.constant(undefined),
      listingStatusHistory: fc.record({
        listingId: fc.uuid(),
        listingStatusId: fc.uuid(),
        isCurrent: fc.option(fc.boolean(), { nil: undefined }),
      }),
    }),
  );
}

function arbitraryNotificationsRawPayload() {
  return fc.record({
    preference: fc.record({
      userId: fc.uuid(),
      notificationTypeId: fc.uuid(),
      channel: fc.constantFrom('EMAIL', 'WHATSAPP'),
      isActive: fc.option(fc.boolean(), { nil: undefined }),
    }),
  });
}

function arbitraryAccountingRawPayload() {
  return fc.oneof(
    fc.record({
      type: fc.constant('aggregated' as const),
      aggregated: fc.record({
        portfolioId: fc.uuid(),
        asOfDate: arbitraryISODate(),
        windowMonths: fc.integer({ min: 1, max: 24 }),
        periodStart: arbitraryISODate(),
        periodEnd: arbitraryISODate(),
        currency: fc.option(fc.constantFrom('COP', 'USD'), { nil: undefined }),
        numberOfUnits: fc.integer({ min: 1, max: 100 }),
        totalAmount: positiveAmount(),
        avgAmount: positiveAmount(),
        paymentCount: fc.integer({ min: 1, max: 500 }),
        minAmount: positiveAmount(),
        maxAmount: positiveAmount(),
        lastPaymentAt: fc.option(arbitraryISODate(), { nil: undefined }),
        firstPaymentAt: fc.option(arbitraryISODate(), { nil: undefined }),
        expectedAmount: positiveAmount(),
        overdueCount: fc.integer({ min: 0, max: 100 }),
      }),
      individual: fc.constant(undefined),
    }),
    fc.record({
      type: fc.constant('individual' as const),
      individual: fc.record({
        portfolioUnitId: fc.uuid(),
        asOfDate: arbitraryISODate(),
        windowMonths: fc.integer({ min: 1, max: 24 }),
        periodStart: arbitraryISODate(),
        periodEnd: arbitraryISODate(),
        currency: fc.option(fc.constantFrom('COP', 'USD'), { nil: undefined }),
        totalAmount: positiveAmount(),
        minAmount: positiveAmount(),
        maxAmount: positiveAmount(),
        paymentCount: fc.integer({ min: 1, max: 500 }),
        lastPaymentAt: fc.option(arbitraryISODate(), { nil: undefined }),
        firstPaymentAt: fc.option(arbitraryISODate(), { nil: undefined }),
        expectedAmount: positiveAmount(),
        overdueCount: fc.integer({ min: 0, max: 100 }),
      }),
      aggregated: fc.constant(undefined),
    }),
  );
}


// ─── Mock PrismaService factory ──────────────────────────────────────────────

function makeMockPrisma() {
  const createdRecords: Record<string, any[]> = {};
  const updatedRecords: Record<string, any[]> = {};

  function trackCreate(model: string) {
    createdRecords[model] = createdRecords[model] ?? [];
    return jest.fn().mockImplementation((args: { data: any }) => {
      const record = { id: `${model}-${createdRecords[model]!.length + 1}`, ...args.data };
      createdRecords[model]!.push(record);
      return Promise.resolve(record);
    });
  }

  function trackUpdate(model: string) {
    updatedRecords[model] = updatedRecords[model] ?? [];
    return jest.fn().mockImplementation((args: { where: any; data: any }) => {
      const record = { ...args.where, ...args.data };
      updatedRecords[model]!.push(record);
      return Promise.resolve(record);
    });
  }

  function trackUpsert(model: string) {
    createdRecords[model] = createdRecords[model] ?? [];
    return jest.fn().mockImplementation((args: { where: any; create: any }) => {
      const record = { id: `${model}-upsert-1`, ...args.create };
      createdRecords[model]!.push(record);
      return Promise.resolve(record);
    });
  }

  const prisma: any = {
    usersRaw: { findMany: jest.fn(), update: trackUpdate('usersRaw') },
    user: { create: trackCreate('user') },
    userRole: { create: trackCreate('userRole') },
    naturalPersonDetail: { create: trackCreate('naturalPersonDetail') },
    legalPersonDetail: { create: trackCreate('legalPersonDetail') },

    propertyListingsRaw: { findMany: jest.fn(), update: trackUpdate('propertyListingsRaw') },
    property: { create: trackCreate('property') },
    address: { create: trackCreate('address') },
    listing: { create: trackCreate('listing') },
    photo: { create: trackCreate('photo') },
    propertyAdditionalFeature: { create: trackCreate('propertyAdditionalFeature') },

    portfolioRaw: { findMany: jest.fn(), update: trackUpdate('portfolioRaw') },
    landlordPortfolio: { create: trackCreate('landlordPortfolio') },
    portfolioUnit: { create: trackCreate('portfolioUnit') },
    lease: { create: trackCreate('lease') },

    paymentsRaw: { findMany: jest.fn(), update: trackUpdate('paymentsRaw') },
    scheduledPayment: { create: trackCreate('scheduledPayment') },
    payment: { create: trackCreate('payment') },
    paymentLog: { create: trackCreate('paymentLog') },

    contractsRaw: { findMany: jest.fn(), update: trackUpdate('contractsRaw') },
    contract: { create: trackCreate('contract') },
    contractParty: { create: trackCreate('contractParty') },
    file: { create: trackCreate('file') },
    signing: { create: trackCreate('signing') },
    signingLog: { create: trackCreate('signingLog') },

    trackingRaw: { findMany: jest.fn(), update: trackUpdate('trackingRaw') },
    leaseStatusHistory: { create: trackCreate('leaseStatusHistory') },
    leaseCurrentStatus: { upsert: trackUpsert('leaseCurrentStatus') },
    listingStatusHistory: { create: trackCreate('listingStatusHistory') },
    listingCurrentStatus: { upsert: trackUpsert('listingCurrentStatus') },

    notificationsRaw: { findMany: jest.fn(), update: trackUpdate('notificationsRaw') },
    notificationPreference: { create: trackCreate('notificationPreference') },

    accountingRaw: { findMany: jest.fn(), update: trackUpdate('accountingRaw') },
    aggregatedPaymentReport: { create: trackCreate('aggregatedPaymentReport') },
    individualPaymentReport: { create: trackCreate('individualPaymentReport') },

    $transaction: jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
  };

  return { prisma, createdRecords, updatedRecords };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Property 15: ETL round-trip — contenido curado es equivalente al RAW original', () => {

  it('ETL round-trip — users: curated User matches RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryUsersRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.usersRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new UsersEtlService(prisma);
        await service.processUsersRaw();

        // Curated content equivalence
        const users = createdRecords['user'] ?? [];
        expect(users).toHaveLength(1);
        expect(users[0].mail).toBe(payload.mail);
        expect(users[0].hashed_password).toBe(payload.hashedPassword);
        expect(users[0].user_type).toBe(payload.userType);
        expect(users[0].document_type_id).toBe(payload.documentTypeId);
        expect(users[0].document_number).toBe(payload.documentNumber);
        expect(users[0].phone_number).toBe(payload.phoneNumber);

        const roles = createdRecords['userRole'] ?? [];
        expect(roles).toHaveLength(1);
        expect(roles[0].role_id).toBe(payload.roleId);

        if (payload.personType === 'natural' && payload.naturalDetails) {
          const details = createdRecords['naturalPersonDetail'] ?? [];
          expect(details).toHaveLength(1);
          expect(details[0].first_name).toBe(payload.naturalDetails.firstName);
          expect(details[0].last_name).toBe(payload.naturalDetails.lastName);
        } else if (payload.personType === 'legal' && payload.legalDetails) {
          const details = createdRecords['legalPersonDetail'] ?? [];
          expect(details).toHaveLength(1);
          expect(details[0].business_name).toBe(payload.legalDetails.businessName);
        }

        // Raw marked processed, not deleted
        const rawUpdates = updatedRecords['usersRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
        expect(rawUpdates[0].id).toBe('raw-1');
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — property-listings: curated Property/Listing/Photos match RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPropertyListingsRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.propertyListingsRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new PropertyListingsEtlService(prisma);
        await service.processPropertyListingsRaw();

        const properties = createdRecords['property'] ?? [];
        expect(properties).toHaveLength(1);
        expect(properties[0].property_type).toBe(payload.propertyType);
        expect(properties[0].number_of_bathrooms).toBe(payload.numberOfBathrooms);
        expect(properties[0].number_of_rooms).toBe(payload.numberOfRooms);

        const addresses = createdRecords['address'] ?? [];
        expect(addresses).toHaveLength(1);
        expect(addresses[0].state).toBe(payload.address.state);
        expect(addresses[0].city).toBe(payload.address.city);
        expect(addresses[0].neighborhood).toBe(payload.address.neighborhood);

        const listings = createdRecords['listing'] ?? [];
        expect(listings).toHaveLength(1);
        expect(listings[0].title).toBe(payload.listing.title);
        expect(listings[0].price).toBe(payload.listing.price);
        expect(listings[0].portfolio_unit_id).toBe(payload.listing.portfolioUnitId);

        const photos = createdRecords['photo'] ?? [];
        expect(photos).toHaveLength(payload.photos.length);
        for (let i = 0; i < payload.photos.length; i++) {
          expect(photos[i].file_url).toBe(payload.photos[i].fileUrl);
        }

        if (payload.additionalFeatures) {
          const feats = createdRecords['propertyAdditionalFeature'] ?? [];
          expect(feats).toHaveLength(payload.additionalFeatures.length);
        }

        const rawUpdates = updatedRecords['propertyListingsRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — landlord-portfolio: curated Portfolio/Units match RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPortfolioRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.portfolioRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new LandlordPortfolioEtlService(prisma);
        await service.processPortfolioRaw();

        const portfolios = createdRecords['landlordPortfolio'] ?? [];
        expect(portfolios).toHaveLength(1);
        expect(portfolios[0].user_id).toBe(payload.userId);
        expect(portfolios[0].name).toBe(payload.name);

        const units = createdRecords['portfolioUnit'] ?? [];
        const expectedUnits = payload.units ?? [];
        expect(units).toHaveLength(expectedUnits.length);
        for (let i = 0; i < expectedUnits.length; i++) {
          expect(units[i].property_id).toBe(expectedUnits[i].propertyId);
          expect(units[i].lease_base_amount).toBe(expectedUnits[i].leaseBaseAmount);
        }

        const leases = createdRecords['lease'] ?? [];
        expect(leases).toHaveLength(expectedUnits.filter((u) => u.lease != null).length);

        const rawUpdates = updatedRecords['portfolioRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — payments: curated ScheduledPayment/Payment match RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPaymentsRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.paymentsRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new PaymentsEtlService(prisma);
        await service.processPaymentsRaw();

        const scheduled = createdRecords['scheduledPayment'] ?? [];
        expect(scheduled).toHaveLength(1);
        expect(scheduled[0].lease_id).toBe(payload.leaseId);
        expect(scheduled[0].amount).toBe(payload.amount);
        expect(scheduled[0].currency).toBe(payload.currency ?? 'COP');

        if (payload.payment) {
          const payments = createdRecords['payment'] ?? [];
          expect(payments).toHaveLength(1);
          expect(payments[0].amount).toBe(payload.payment.amount);
          expect(payments[0].currency).toBe(payload.payment.currency ?? 'COP');

          const logs = createdRecords['paymentLog'] ?? [];
          expect(logs).toHaveLength((payload.payment.logs ?? []).length);
        }

        const rawUpdates = updatedRecords['paymentsRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — contracts: curated Contract/Parties/Files match RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryContractsRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.contractsRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new ContractsEtlService(prisma);
        await service.processContractsRaw();

        const contracts = createdRecords['contract'] ?? [];
        expect(contracts).toHaveLength(1);
        expect(contracts[0].lease_id).toBe(payload.leaseId);
        expect(contracts[0].contract_status_id).toBe(payload.contractStatusId);

        const parties = createdRecords['contractParty'] ?? [];
        expect(parties).toHaveLength(payload.parties.length);
        for (let i = 0; i < payload.parties.length; i++) {
          expect(parties[i].user_id).toBe(payload.parties[i].userId);
          expect(parties[i].role_in_contract).toBe(payload.parties[i].roleInContract);
        }

        const files = createdRecords['file'] ?? [];
        expect(files).toHaveLength((payload.files ?? []).length);

        const signings = createdRecords['signing'] ?? [];
        expect(signings).toHaveLength((payload.signings ?? []).length);

        const rawUpdates = updatedRecords['contractsRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — tracking: curated StatusHistory matches RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryTrackingRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.trackingRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new RentalTrackingEtlService(prisma);
        await service.processTrackingRaw();

        if (payload.leaseStatusHistory) {
          const histories = createdRecords['leaseStatusHistory'] ?? [];
          expect(histories).toHaveLength(1);
          expect(histories[0].lease_id).toBe(payload.leaseStatusHistory.leaseId);
          expect(histories[0].lease_status_id).toBe(payload.leaseStatusHistory.leaseStatusId);

          if (payload.leaseStatusHistory.isCurrent) {
            expect(createdRecords['leaseCurrentStatus'] ?? []).toHaveLength(1);
          }
        }

        if (payload.listingStatusHistory) {
          const histories = createdRecords['listingStatusHistory'] ?? [];
          expect(histories).toHaveLength(1);
          expect(histories[0].listing_id).toBe(payload.listingStatusHistory.listingId);
          expect(histories[0].listing_status_id).toBe(payload.listingStatusHistory.listingStatusId);

          if (payload.listingStatusHistory.isCurrent) {
            expect(createdRecords['listingCurrentStatus'] ?? []).toHaveLength(1);
          }
        }

        const rawUpdates = updatedRecords['trackingRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — notifications: curated NotificationPreference matches RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryNotificationsRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.notificationsRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new NotificationsEtlService(prisma);
        await service.processNotificationsRaw();

        const prefs = createdRecords['notificationPreference'] ?? [];
        expect(prefs).toHaveLength(1);
        expect(prefs[0].user_id).toBe(payload.preference.userId);
        expect(prefs[0].notification_type_id).toBe(payload.preference.notificationTypeId);
        expect(prefs[0].channel).toBe(payload.preference.channel);
        expect(prefs[0].is_active).toBe(payload.preference.isActive ?? true);

        const rawUpdates = updatedRecords['notificationsRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('ETL round-trip — accounting: curated Report matches RAW payload', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAccountingRawPayload(), async (payload) => {
        const { prisma, createdRecords, updatedRecords } = makeMockPrisma();
        prisma.accountingRaw.findMany.mockResolvedValue([{ id: 'raw-1', payload, created_at: new Date(), processed: false }]);

        const service = new AccountingEtlService(prisma);
        await service.processAccountingRaw();

        if (payload.type === 'aggregated' && payload.aggregated) {
          const reports = createdRecords['aggregatedPaymentReport'] ?? [];
          expect(reports).toHaveLength(1);
          expect(reports[0].portfolio_id).toBe(payload.aggregated.portfolioId);
          expect(reports[0].window_months).toBe(payload.aggregated.windowMonths);
          expect(reports[0].number_of_units).toBe(payload.aggregated.numberOfUnits);
          expect(reports[0].total_amount).toBe(payload.aggregated.totalAmount);
          expect(reports[0].payment_count).toBe(payload.aggregated.paymentCount);
          expect(reports[0].currency).toBe(payload.aggregated.currency ?? 'COP');
        } else if (payload.type === 'individual' && payload.individual) {
          const reports = createdRecords['individualPaymentReport'] ?? [];
          expect(reports).toHaveLength(1);
          expect(reports[0].portfolio_unit_id).toBe(payload.individual.portfolioUnitId);
          expect(reports[0].window_months).toBe(payload.individual.windowMonths);
          expect(reports[0].total_amount).toBe(payload.individual.totalAmount);
          expect(reports[0].payment_count).toBe(payload.individual.paymentCount);
          expect(reports[0].currency).toBe(payload.individual.currency ?? 'COP');
        }

        const rawUpdates = updatedRecords['accountingRaw'] ?? [];
        expect(rawUpdates).toHaveLength(1);
        expect(rawUpdates[0].processed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
