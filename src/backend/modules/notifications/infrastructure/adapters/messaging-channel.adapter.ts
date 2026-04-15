import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerFactory } from '@src/shared/circuit-breaker/circuit-breaker.factory';
import type { IMessagingChannel, MessagePayload } from '../../domain/ports/messaging-channel.port';

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

/**
 * MessagingChannelAdapter
 *
 * Adapter for external messaging channels (EMAIL, WHATSAPP).
 * Applies circuit breaker (timeout 15s, failureThreshold 3) and
 * retries up to 2 times with exponential backoff (500ms → 1000ms).
 *
 * MVP stub: logs to console. Real WhatsApp/email integration is post-MVP.
 *
 * Requirements: 9.3, 12.1, 12.3
 */
@Injectable()
export class MessagingChannelAdapter implements IMessagingChannel {
  private readonly logger = new Logger(MessagingChannelAdapter.name);

  constructor(private readonly circuitBreakerFactory: CircuitBreakerFactory) {}

  async send(payload: MessagePayload): Promise<void> {
    const breaker = this.circuitBreakerFactory.create('messaging-channel', 'messaging');

    await breaker.execute(
      () => this.callWithRetry(payload),
      () => {
        this.logger.warn(
          `MessagingChannel circuit OPEN — notification suppressed for user ${payload.userId} via ${payload.channel}`,
        );
      },
    );
  }

  private async callWithRetry(payload: MessagePayload): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1); // 500ms → 1000ms
        this.logger.warn(
          `MessagingChannel retry ${attempt}/${MAX_RETRIES} for user ${payload.userId} — waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      try {
        await this.callChannel(payload);
        return;
      } catch (err) {
        lastError = err;
        this.logger.error(
          `MessagingChannel attempt ${attempt + 1} failed for user ${payload.userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    throw lastError;
  }

  private async callChannel(payload: MessagePayload): Promise<void> {
    // MVP stub — real implementation will call WhatsApp Business API or email provider
    // using channel-specific credentials from ConfigService
    this.logger.log(
      `[${payload.channel}] Notification sent to user ${payload.userId} | event: ${payload.eventSource} | data: ${JSON.stringify(payload.data)}`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
