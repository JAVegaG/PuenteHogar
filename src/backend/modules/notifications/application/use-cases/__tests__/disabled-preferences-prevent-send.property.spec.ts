// Feature: backend-database-implementation, Property 46: Preferencias de notificación desactivadas previenen envío por ese canal
// Validates: Requirements 9.6

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
  preferences: NotificationPreferenceEntity[],
): { repo: jest.Mocked<INotificationRepository>; persisted: NotificationRecord[] } {
  const persisted: NotificationRecord[] = [];

  const repo: jest.Mocked<INotificationRepository> = {
    findNotificationTypeByName: jest.fn().mockResolvedValue({
      id: NOTIFICATION_TYPE_ID,
      name: NOTIFICATION_TYPE_NAME,
    }),
    findPreferenceByUserAndType: jest.fn().mockImplementation(
      (_userId: string, _typeId: string) =>
        Promise.resolve(preferences.find((p) => p.notificationTypeId === _typeId) ?? null),
    ),
    findPreferencesByUserId: jest.fn().mockResolvedValue(preferences),
    upsertPreference: jest.fn().mockResolvedValue(undefined),
    persistNotification: jest.fn().mockImplementation((record: NotificationRecord) => {
      persisted.push(record);
      return Promise.resolve();
    }),
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

function makePreference(
  userId: string,
  channel: NotificationChannel,
  isActive: boolean,
): NotificationPreferenceEntity {
  return new NotificationPreferenceEntity(
    `pref-${channel}`,
    userId,
    NOTIFICATION_TYPE_ID,
    channel,
    isActive,
    new Date(),
    new Date(),
  );
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property 46: Preferencias de notificación desactivadas previenen envío por ese canal', () => {

  describe('when the preferred channel is disabled and fallback channel is also disabled', () => {
    it('does NOT send via any channel and persists notification as FAILED', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, eventSource, data) => {
            // Both channels disabled for this notification type
            const preferences = [
              makePreference(userId, 'WHATSAPP', false),
              makePreference(userId, 'EMAIL', false),
            ];

            const { repo, persisted } = makeMockRepo(preferences);
            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            // No message should have been sent
            expect(sentPayloads).toHaveLength(0);
            expect(channel.send).not.toHaveBeenCalled();

            // Notification should be persisted as FAILED
            expect(persisted).toHaveLength(1);
            expect(persisted[0].status).toBe('FAILED');
            expect(persisted[0].userId).toBe(userId);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('when a specific channel is disabled, notification is not sent via that channel', () => {
    it('falls back to EMAIL when WHATSAPP preference is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, eventSource, data) => {
            // WHATSAPP disabled, EMAIL active
            const preferences = [
              makePreference(userId, 'WHATSAPP', false),
              makePreference(userId, 'EMAIL', true),
            ];

            const { repo, persisted } = makeMockRepo(preferences);
            // Override to return the WHATSAPP (disabled) preference as the primary one
            repo.findPreferenceByUserAndType.mockResolvedValue(
              makePreference(userId, 'WHATSAPP', false),
            );

            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            // Should have sent via EMAIL (fallback), not WHATSAPP
            expect(sentPayloads).toHaveLength(1);
            expect(sentPayloads[0].channel).toBe('EMAIL');
            expect(sentPayloads[0].channel).not.toBe('WHATSAPP');

            // Persisted notification should reflect EMAIL channel
            expect(persisted).toHaveLength(1);
            expect(persisted[0].channel).toBe('EMAIL');
            expect(persisted[0].status).toBe('SENT');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('disabled preference suppresses notification and persists record', () => {
    it('for any channel, disabling it prevents sending and records FAILED status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, disabledChannel, eventSource, data) => {
            // Only one preference exists and it is disabled; no fallback available
            // When the primary channel is disabled, use case falls back to EMAIL.
            // If EMAIL is the disabled channel, the fallback check catches it.
            // If WHATSAPP is disabled, fallback is EMAIL — we need EMAIL also disabled to suppress.
            const preferences = CHANNELS.map((ch) =>
              makePreference(userId, ch, false),
            );

            const { repo, persisted } = makeMockRepo(preferences);
            repo.findPreferenceByUserAndType.mockResolvedValue(
              makePreference(userId, disabledChannel, false),
            );

            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            // No message should be sent when all channels are disabled
            expect(sentPayloads).toHaveLength(0);
            expect(channel.send).not.toHaveBeenCalled();

            // Notification persisted as FAILED
            expect(persisted).toHaveLength(1);
            expect(persisted[0].status).toBe('FAILED');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('active preference allows sending normally', () => {
    it('sends notification when the preferred channel is active', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          async (userId, activeChannel, eventSource, data) => {
            const preferences = [makePreference(userId, activeChannel, true)];

            const { repo, persisted } = makeMockRepo(preferences);
            repo.findPreferenceByUserAndType.mockResolvedValue(
              makePreference(userId, activeChannel, true),
            );

            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const useCase = new SendNotificationUseCase(repo, channel, auditLogger);

            await useCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data,
            });

            // Message should be sent via the active channel
            expect(sentPayloads).toHaveLength(1);
            expect(sentPayloads[0].channel).toBe(activeChannel);
            expect(sentPayloads[0].userId).toBe(userId);

            // Persisted as SENT
            expect(persisted).toHaveLength(1);
            expect(persisted[0].status).toBe('SENT');
            expect(persisted[0].channel).toBe(activeChannel);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
