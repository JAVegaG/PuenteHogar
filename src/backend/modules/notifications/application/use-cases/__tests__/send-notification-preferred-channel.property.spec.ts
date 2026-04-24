// Feature: backend-database-implementation, Property 44: Notificación enviada por el canal preferido del usuario
// Validates: Requirements 9.2

import * as fc from 'fast-check';
import type { INotificationRepository, NotificationRecord } from '@modules/notifications/domain/ports/notification-repository.port';
import type { IMessagingChannel, MessagePayload } from '@modules/notifications/domain/ports/messaging-channel.port';
import type { NotificationChannel } from '@modules/notifications/domain/entities/notification-preference.entity';
import { NotificationPreferenceEntity } from '@modules/notifications/domain/entities/notification-preference.entity';
import { AuditLoggerService } from '@src/shared/audit/audit-logger.service';
import { SendNotificationUseCase } from '../send-notification.use-case';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: NotificationChannel[] = ['EMAIL', 'WHATSAPP'];
const NOTIFICATION_TYPE_ID = 'nt-001';
const NOTIFICATION_TYPE_NAME = 'CONTRACT_SIGNED';

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
  preferredChannel: NotificationChannel | null,
  isActive = true,
): { repo: jest.Mocked<INotificationRepository>; persisted: NotificationRecord[] } {
  const persisted: NotificationRecord[] = [];

  const preferences: NotificationPreferenceEntity[] = preferredChannel
    ? [
      new NotificationPreferenceEntity(
        'pref-1',
        'any-user',
        NOTIFICATION_TYPE_ID,
        preferredChannel,
        isActive,
        new Date(),
        new Date(),
      ),
    ]
    : [];

  // Active external preferences: only include if isActive is true
  const activeExternalPrefs = preferences.filter((p) => p.isActive);

  const repo: jest.Mocked<INotificationRepository> = {
    findNotificationTypeByName: jest.fn().mockResolvedValue({
      id: NOTIFICATION_TYPE_ID,
      name: NOTIFICATION_TYPE_NAME,
    }),
    findPreferenceByUserAndType: jest.fn().mockImplementation(
      (_userId: string, _typeId: string) =>
        Promise.resolve(preferences[0] ?? null),
    ),
    findPreferencesByUserId: jest.fn().mockResolvedValue(preferences),
    upsertPreference: jest.fn().mockResolvedValue(undefined),
    persistNotification: jest.fn().mockImplementation((record: NotificationRecord) => {
      persisted.push(record);
      return Promise.resolve();
    }),
    createInAppNotification: jest.fn().mockResolvedValue(null),
    findInAppNotificationsByUserId: jest.fn().mockResolvedValue([]),
    countUnreadByUserId: jest.fn().mockResolvedValue(0),
    markAsRead: jest.fn().mockResolvedValue(null),
    markAllAsRead: jest.fn().mockResolvedValue(0),
    findAllNotificationTypes: jest.fn().mockResolvedValue([]),
    findActiveExternalPreferences: jest.fn().mockResolvedValue(activeExternalPrefs),
  };

  return { repo, persisted };
}

function makeMockMessagingChannel(): {
  channel: jest.Mocked<IMessagingChannel>;
  sentPayloads: MessagePayload[];
} {
  const sentPayloads: MessagePayload[] = [];
  const channel: jest.Mocked<IMessagingChannel> = {
    send: jest.fn().mockImplementation((payload: MessagePayload) => {
      sentPayloads.push(payload);
      return Promise.resolve();
    }),
  };
  return { channel, sentPayloads };
}

function makeMockAuditLogger(): jest.Mocked<AuditLoggerService> {
  return {
    log: jest.fn(),
    logFailedLogin: jest.fn(),
  } as unknown as jest.Mocked<AuditLoggerService>;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 44: Notificación enviada por el canal preferido del usuario', () => {

  describe('notification uses the preferred channel when preference is active', () => {
    it('sends via the user-configured preferred channel', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, preferredChannel, eventSource, data) => {
            const { repo } = makeMockRepo(preferredChannel, true);
            // Override findActiveExternalPreferences to return the active preference
            const activePref = new NotificationPreferenceEntity(
              'pref-1', userId, NOTIFICATION_TYPE_ID,
              preferredChannel, true, new Date(), new Date(),
            );
            repo.findActiveExternalPreferences.mockResolvedValue([activePref]);

            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            // The messaging channel must have been called exactly once
            expect(sentPayloads).toHaveLength(1);
            // The channel used must match the user's preferred channel
            expect(sentPayloads[0].channel).toBe(preferredChannel);
            expect(sentPayloads[0].userId).toBe(userId);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('no external sends when no preference is configured', () => {
    it('does not send via any external channel if user has no active preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, eventSource, data) => {
            const { repo } = makeMockRepo(null);
            repo.findActiveExternalPreferences.mockResolvedValue([]);

            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            // No external sends when no active preferences
            expect(sentPayloads).toHaveLength(0);
            // But in-app notification should still be created
            expect(repo.createInAppNotification).toHaveBeenCalledTimes(1);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('persisted notification records the channel used', () => {
    it('persists the notification with the same channel that was used for sending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, preferredChannel, eventSource, data) => {
            const { repo, persisted } = makeMockRepo(preferredChannel, true);
            // Override findActiveExternalPreferences to return the active preference
            const activePref = new NotificationPreferenceEntity(
              'pref-1', userId, NOTIFICATION_TYPE_ID,
              preferredChannel, true, new Date(), new Date(),
            );
            repo.findActiveExternalPreferences.mockResolvedValue([activePref]);

            const { channel } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            expect(persisted).toHaveLength(1);
            expect(persisted[0].channel).toBe(preferredChannel);
            expect(persisted[0].status).toBe('SENT');
            expect(persisted[0].userId).toBe(userId);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('each channel type is correctly forwarded to the messaging adapter', () => {
    it.each(CHANNELS)('correctly sends via %s when it is the preferred channel', async (ch) => {
      const preferredChannel = ch as NotificationChannel;
      const userId = 'user-fixed-id';

      const { repo } = makeMockRepo(preferredChannel, true);
      // Override findActiveExternalPreferences to return the active preference
      const activePref = new NotificationPreferenceEntity(
        'pref-1', userId, NOTIFICATION_TYPE_ID,
        preferredChannel, true, new Date(), new Date(),
      );
      repo.findActiveExternalPreferences.mockResolvedValue([activePref]);

      const { channel, sentPayloads } = makeMockMessagingChannel();
      const auditLogger = makeMockAuditLogger();

      const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

      await useCase.execute({
        userId,
        notificationTypeName: NOTIFICATION_TYPE_NAME,
        eventSource: 'test-event',
        data: { key: 'value' },
      });

      expect(sentPayloads).toHaveLength(1);
      expect(sentPayloads[0].channel).toBe(preferredChannel);
    });
  });
});
