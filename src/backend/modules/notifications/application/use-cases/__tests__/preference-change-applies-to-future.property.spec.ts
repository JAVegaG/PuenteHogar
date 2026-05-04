// Feature: backend-database-implementation, Property 47: Cambio de preferencias aplica a notificaciones futuras
// Validates: Requirements 9.7

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
import { UpdateNotificationPreferencesUseCase } from '../update-notification-preferences.use-case';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPE_ID = 'nt-pref-change';
const NOTIFICATION_TYPE_NAME = 'PAYMENT_RECEIVED';

// ─── Generators ───────────────────────────────────────────────────────────────

const arbitraryChannel = (): fc.Arbitrary<NotificationChannel> =>
  fc.constantFrom<NotificationChannel>('EMAIL', 'WHATSAPP');

const arbitraryEventSource = (): fc.Arbitrary<string> =>
  fc.constantFrom('contract-signed', 'payment-received', 'new-interest', 'payment-due');

const arbitraryNotificationData = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    contractId: fc.uuid(),
    amount: fc.float({ min: 1, max: 100000, noNaN: true }),
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mutable preference store that simulates real DB behavior:
 * - upsertPreference updates the in-memory store
 * - findPreferenceByUserAndType reads from the current state
 * - findPreferencesByUserId reads from the current state
 *
 * This lets us verify that SendNotificationUseCase reads preferences
 * at execution time (not at enqueue time), so preference changes
 * apply to future notifications.
 */
function makeMutableRepo(initialChannel: NotificationChannel): {
  repo: jest.Mocked<INotificationRepository>;
  persisted: NotificationRecord[];
  getPreferences: () => Map<string, NotificationPreferenceEntity>;
} {
  const persisted: NotificationRecord[] = [];
  // key: `${userId}:${notificationTypeId}:${channel}`
  const preferences = new Map<string, NotificationPreferenceEntity>();

  const buildKey = (userId: string, typeId: string, channel: NotificationChannel) =>
    `${userId}:${typeId}:${channel}`;

  const repo: jest.Mocked<INotificationRepository> = {
    findNotificationTypeByName: jest.fn().mockResolvedValue({
      id: NOTIFICATION_TYPE_ID,
      name: NOTIFICATION_TYPE_NAME,
    }),

    findPreferenceByUserAndType: jest.fn().mockImplementation(
      (userId: string, typeId: string) => {
        // Return the first active preference, or the first one found
        const userPrefs = Array.from(preferences.values()).filter(
          (p) => p.userId === userId && p.notificationTypeId === typeId,
        );
        // Prefer the initial channel preference (simulates "preferred channel")
        const preferred = userPrefs.find((p) => p.channel === initialChannel);
        return Promise.resolve(preferred ?? userPrefs[0] ?? null);
      },
    ),

    findPreferencesByUserId: jest.fn().mockImplementation((userId: string) => {
      return Promise.resolve(
        Array.from(preferences.values()).filter((p) => p.userId === userId),
      );
    }),

    upsertPreference: jest.fn().mockImplementation(
      (userId: string, typeId: string, channel: NotificationChannel, isActive: boolean) => {
        const key = buildKey(userId, typeId, channel);
        preferences.set(
          key,
          new NotificationPreferenceEntity(
            `pref-${key}`,
            userId,
            typeId,
            channel,
            isActive,
            new Date(),
            new Date(),
          ),
        );
        return Promise.resolve();
      },
    ),

    persistNotification: jest.fn().mockImplementation((record: NotificationRecord) => {
      persisted.push(record);
      return Promise.resolve();
    }),
    createInAppNotification: jest.fn().mockResolvedValue(null),
    findInAppNotificationsByUserId: jest.fn().mockResolvedValue([]),
    countUnreadByUserId: jest.fn().mockResolvedValue(0),
    markAsRead: jest.fn().mockResolvedValue(null),
    markAllAsRead: jest.fn().mockResolvedValue(0),
    softDeleteNotification: jest.fn().mockResolvedValue(undefined),
    softDeleteAllReadByUserId: jest.fn().mockResolvedValue(0),
    findAllNotificationTypes: jest.fn().mockResolvedValue([]),
    findActiveExternalPreferences: jest.fn().mockImplementation(
      (userId: string, typeId: string) => {
        const activePrefs = Array.from(preferences.values()).filter(
          (p) => p.userId === userId && p.notificationTypeId === typeId && p.isActive,
        );
        return Promise.resolve(activePrefs);
      },
    ),
  };

  return { repo, persisted, getPreferences: () => preferences };
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

describe('Property 47: Cambio de preferencias aplica a notificaciones futuras', () => {

  describe('preference change from active to disabled affects the next notification', () => {
    it('notification sent before change uses original channel; notification after change reflects updated preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          arbitraryNotificationData(),
          async (userId, originalChannel, eventSource, dataBefore, dataAfter) => {
            const { repo, persisted } = makeMutableRepo(originalChannel);
            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const sendUseCase = new SendNotificationUseCase(repo, channel, auditLogger);
            const updateUseCase = new UpdateNotificationPreferencesUseCase(repo);

            // Setup: user has the original channel active
            await repo.upsertPreference(userId, NOTIFICATION_TYPE_ID, originalChannel, true);

            // ── Step 1: Send notification BEFORE preference change ──
            await sendUseCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data: dataBefore,
            });

            // Notification should be sent via the original active channel
            expect(sentPayloads).toHaveLength(1);
            expect(sentPayloads[0].channel).toBe(originalChannel);
            expect(persisted).toHaveLength(1);
            expect(persisted[0].status).toBe('SENT');
            expect(persisted[0].channel).toBe(originalChannel);

            // ── Step 2: Disable the original channel ──
            await updateUseCase.execute(userId, {
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              channel: originalChannel,
              isActive: false,
            });

            // ── Step 3: Send notification AFTER preference change ──
            await sendUseCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data: dataAfter,
            });

            // The second notification must NOT use the now-disabled channel
            // With the new flow, no external send happens when channel is disabled
            if (persisted.length === 2) {
              // If another channel was active, it was sent via that channel
              const secondNotification = persisted[1];
              if (secondNotification.status === 'SENT') {
                expect(secondNotification.channel).not.toBe(originalChannel);
              }
            } else {
              // No external notification persisted — only in-app was created
              expect(persisted).toHaveLength(1);
            }
            // In-app notification should always be created (twice total)
            expect(repo.createInAppNotification).toHaveBeenCalledTimes(2);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('preference change from disabled to active enables future notifications', () => {
    it('notification after re-enabling a channel uses that channel', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryChannel(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          arbitraryNotificationData(),
          async (userId, targetChannel, eventSource, dataBefore, dataAfter) => {
            const { repo, persisted } = makeMutableRepo(targetChannel);
            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const sendUseCase = new SendNotificationUseCase(repo, channel, auditLogger);
            const updateUseCase = new UpdateNotificationPreferencesUseCase(repo);

            // Setup: both channels disabled
            await repo.upsertPreference(userId, NOTIFICATION_TYPE_ID, 'EMAIL', false);
            await repo.upsertPreference(userId, NOTIFICATION_TYPE_ID, 'WHATSAPP', false);

            // ── Step 1: Send notification — should not send externally (all channels disabled) ──
            await sendUseCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data: dataBefore,
            });

            // No external notification persisted
            expect(persisted).toHaveLength(0);
            expect(sentPayloads).toHaveLength(0);
            // But in-app notification should be created
            expect(repo.createInAppNotification).toHaveBeenCalledTimes(1);

            // ── Step 2: Re-enable the target channel ──
            await updateUseCase.execute(userId, {
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              channel: targetChannel,
              isActive: true,
            });

            // ── Step 3: Send notification — should now succeed via re-enabled channel ──
            await sendUseCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data: dataAfter,
            });

            expect(persisted).toHaveLength(1);
            const externalNotification = persisted[0];
            expect(externalNotification.status).toBe('SENT');
            expect(externalNotification.channel).toBe(targetChannel);
            expect(sentPayloads).toHaveLength(1);
            expect(sentPayloads[0].channel).toBe(targetChannel);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('switching preferred channel applies to the next notification', () => {
    it('after switching from one channel to another, future notifications use the new channel', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryEventSource(),
          arbitraryNotificationData(),
          arbitraryNotificationData(),
          async (userId, eventSource, dataBefore, dataAfter) => {
            // Start with WHATSAPP active, EMAIL inactive
            const { repo, persisted } = makeMutableRepo('WHATSAPP');
            const { channel, sentPayloads } = makeMockMessagingChannel();
            const auditLogger = makeMockAuditLogger();

            const sendUseCase = new SendNotificationUseCase(repo, channel, auditLogger);
            const updateUseCase = new UpdateNotificationPreferencesUseCase(repo);

            await repo.upsertPreference(userId, NOTIFICATION_TYPE_ID, 'WHATSAPP', true);
            await repo.upsertPreference(userId, NOTIFICATION_TYPE_ID, 'EMAIL', false);

            // ── Step 1: Send — should go via WHATSAPP ──
            await sendUseCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data: dataBefore,
            });

            expect(sentPayloads).toHaveLength(1);
            expect(sentPayloads[0].channel).toBe('WHATSAPP');
            expect(persisted[0].channel).toBe('WHATSAPP');

            // ── Step 2: Switch — disable WHATSAPP, enable EMAIL ──
            await updateUseCase.execute(userId, {
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              channel: 'WHATSAPP',
              isActive: false,
            });
            await updateUseCase.execute(userId, {
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              channel: 'EMAIL',
              isActive: true,
            });

            // ── Step 3: Send — should now go via EMAIL ──
            await sendUseCase.execute({
              userId,
              notificationTypeName: NOTIFICATION_TYPE_NAME,
              eventSource,
              data: dataAfter,
            });

            expect(persisted).toHaveLength(2);
            expect(persisted[1].channel).toBe('EMAIL');
            expect(persisted[1].status).toBe('SENT');
            expect(sentPayloads).toHaveLength(2);
            expect(sentPayloads[1].channel).toBe('EMAIL');
            // In-app notifications should always be created
            expect(repo.createInAppNotification).toHaveBeenCalledTimes(2);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
