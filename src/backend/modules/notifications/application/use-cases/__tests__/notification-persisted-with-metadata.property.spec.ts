// Feature: backend-database-implementation, Property 45: Notificación persistida con estado, canal, timestamp y evento origen
// Validates: Requirements 9.4

import * as fc from 'fast-check';
import type {
  INotificationRepository,
  NotificationRecord,
} from '@modules/notifications/domain/ports/notification-repository.port';
import type {
  IMessagingChannel,
  MessagePayload,
} from '@modules/notifications/domain/ports/messaging-channel.port';
import type { NotificationChannel } from '@modules/notifications/domain/entities/notification-preference.entity';
import { NotificationPreferenceEntity } from '@modules/notifications/domain/entities/notification-preference.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { SendNotificationUseCase } from '../send-notification.use-case';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: NotificationChannel[] = ['EMAIL', 'WHATSAPP'];
const NOTIFICATION_TYPE_ID = 'nt-001';
const NOTIFICATION_TYPE_NAME = 'CONTRACT_SIGNED';
const VALID_STATUSES = ['SENT', 'FAILED', 'PENDING'];

// ─── Generators ───────────────────────────────────────────────────────────────

const arbitraryChannel = (): fc.Arbitrary<NotificationChannel> =>
  fc.constantFrom<NotificationChannel>(...CHANNELS);

const arbitraryEventSource = (): fc.Arbitrary<string> =>
  fc.constantFrom('contract-signed', 'payment-received', 'new-interest', 'payment-due');

const arbitraryNotificationData = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    contractId: fc.uuid(),
    amount: fc.float({ min: 1, max: 100000, noNaN: true }),
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockRepo(
  preferredChannel: NotificationChannel,
  userId: string,
): { repo: jest.Mocked<INotificationRepository>; persisted: NotificationRecord[] } {
  const persisted: NotificationRecord[] = [];

  const pref = new NotificationPreferenceEntity(
    'pref-1', userId, NOTIFICATION_TYPE_ID,
    preferredChannel, true, new Date(), new Date(),
  );

  const repo: jest.Mocked<INotificationRepository> = {
    findNotificationTypeByName: jest.fn().mockResolvedValue({
      id: NOTIFICATION_TYPE_ID, name: NOTIFICATION_TYPE_NAME,
    }),
    findPreferenceByUserAndType: jest.fn().mockResolvedValue(pref),
    findPreferencesByUserId: jest.fn().mockResolvedValue([pref]),
    upsertPreference: jest.fn().mockResolvedValue(undefined),
    persistNotification: jest.fn().mockImplementation((record: NotificationRecord) => {
      persisted.push(record);
      return Promise.resolve();
    }),
  };

  return { repo, persisted };
}

function makeMockMessagingChannel(shouldFail = false): jest.Mocked<IMessagingChannel> {
  return {
    send: shouldFail
      ? jest.fn().mockRejectedValue(new Error('Channel unavailable'))
      : jest.fn().mockResolvedValue(undefined),
  };
}

function makeMockAuditLogger(): jest.Mocked<AuditLoggerService> {
  return { log: jest.fn(), logFailedLogin: jest.fn() } as unknown as jest.Mocked<AuditLoggerService>;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 45: Notificación persistida con estado, canal, timestamp y evento origen', () => {

  describe('successful notification persists with SENT status, channel, timestamp and event source', () => {
    it('persists all required metadata when send succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, preferredChannel, eventSource, data) => {
            const { repo, persisted } = makeMockRepo(preferredChannel, userId);
            const channel = makeMockMessagingChannel(false);
            const auditLogger = makeMockAuditLogger();
            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({ userId, notificationTypeName: NOTIFICATION_TYPE_NAME, eventSource, data });

            // Exactly one notification must be persisted
            expect(persisted).toHaveLength(1);
            const record = persisted[0];

            // Status must be SENT
            expect(record.status).toBe('SENT');
            // Channel must match the preferred channel
            expect(CHANNELS).toContain(record.channel);
            expect(record.channel).toBe(preferredChannel);
            // Event source must be preserved
            expect(record.eventSource).toBe(eventSource);
            // Notification type ID must be set
            expect(record.notificationTypeId).toBe(NOTIFICATION_TYPE_ID);
            // User ID must be preserved
            expect(record.userId).toBe(userId);
            // sentAt timestamp must be present for SENT notifications
            expect(record.sentAt).toBeInstanceOf(Date);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('failed notification persists with FAILED status, channel and event source', () => {
    it('persists all required metadata when send fails after retries', async () => {
      // Mock sleep to avoid real delays during failure retries
      const sleepSpy = jest
        .spyOn(SendNotificationUseCase.prototype as any, 'sleep')
        .mockResolvedValue(undefined);

      try {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),
            arbitraryChannel(),
            arbitraryEventSource(),
            arbitraryNotificationData(),
            async (userId, preferredChannel, eventSource, data) => {
              const { repo, persisted } = makeMockRepo(preferredChannel, userId);
              const channel = makeMockMessagingChannel(true);
              const auditLogger = makeMockAuditLogger();
              const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

              await useCase.execute({ userId, notificationTypeName: NOTIFICATION_TYPE_NAME, eventSource, data });

              expect(persisted).toHaveLength(1);
              const record = persisted[0];

              // Status must be FAILED after exhausting retries
              expect(record.status).toBe('FAILED');
              // Channel must still be recorded
              expect(CHANNELS).toContain(record.channel);
              expect(record.channel).toBe(preferredChannel);
              // Event source must be preserved
              expect(record.eventSource).toBe(eventSource);
              // Notification type ID must be set
              expect(record.notificationTypeId).toBe(NOTIFICATION_TYPE_ID);
              // User ID must be preserved
              expect(record.userId).toBe(userId);
              // sentAt should be undefined for FAILED notifications
              expect(record.sentAt).toBeUndefined();

              return true;
            },
          ),
          { numRuns: 100 },
        );
      } finally {
        sleepSpy.mockRestore();
      }
    });
  });

  describe('persisted status is always a valid NotificationStatus value', () => {
    it('status is one of SENT, FAILED, PENDING for any outcome', async () => {
      const sleepSpy = jest
        .spyOn(SendNotificationUseCase.prototype as any, 'sleep')
        .mockResolvedValue(undefined);

      try {
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(),
            arbitraryChannel(),
            arbitraryEventSource(),
            arbitraryNotificationData(),
            fc.boolean(),
            async (userId, preferredChannel, eventSource, data, sendSucceeds) => {
              const { repo, persisted } = makeMockRepo(preferredChannel, userId);
              const channel = makeMockMessagingChannel(!sendSucceeds);
              const auditLogger = makeMockAuditLogger();
              const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

              await useCase.execute({ userId, notificationTypeName: NOTIFICATION_TYPE_NAME, eventSource, data });

              expect(persisted).toHaveLength(1);
              expect(VALID_STATUSES).toContain(persisted[0].status);

              return true;
            },
          ),
          { numRuns: 100 },
        );
      } finally {
        sleepSpy.mockRestore();
      }
    });
  });

  describe('event source is never lost during persistence', () => {
    it('eventSource in persisted record always matches the input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, preferredChannel, eventSource, data) => {
            const { repo, persisted } = makeMockRepo(preferredChannel, userId);
            const channel = makeMockMessagingChannel(false);
            const auditLogger = makeMockAuditLogger();
            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({ userId, notificationTypeName: NOTIFICATION_TYPE_NAME, eventSource, data });

            expect(persisted).toHaveLength(1);
            expect(persisted[0].eventSource).toBe(eventSource);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
