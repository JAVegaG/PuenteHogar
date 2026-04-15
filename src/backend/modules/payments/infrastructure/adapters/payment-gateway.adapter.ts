import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentGateway,
  PaymentGatewayResult,
  PaymentRequest,
} from '../../domain/ports/payment-gateway.port';

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

/**
 * Adapter for the external payment gateway (PSE / debit / credit cards).
 *
 * Retry policy: up to 2 retries with exponential backoff (500ms, 1000ms).
 * Circuit breaker (timeout 30s, failureThreshold 3) is applied by the
 * calling use case via CircuitBreakerFactory — this adapter only handles
 * the retry logic so transient failures don't immediately count as circuit failures.
 *
 * Idempotency Key is forwarded in every request to the gateway to prevent
 * duplicate transactions (Req 6.1, 6.2).
 *
 * MVP stub: returns APPROVED with a mock redirect URL.
 * Real PSE integration is post-MVP.
 */
@Injectable()
export class PaymentGatewayAdapter implements IPaymentGateway {
  private readonly logger = new Logger(PaymentGatewayAdapter.name);

  // ConfigService kept for future real gateway configuration (API key, base URL, etc.)
  constructor(private readonly configService: ConfigService) {}

  async initiatePayment(request: PaymentRequest): Promise<PaymentGatewayResult> {
    return this.callWithRetry(request);
  }

  private async callWithRetry(request: PaymentRequest): Promise<PaymentGatewayResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1); // 500ms → 1000ms
        this.logger.warn(
          `PaymentGateway retry ${attempt}/${MAX_RETRIES} for payment ${request.scheduledPaymentId} — waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      try {
        return await this.callGateway(request);
      } catch (err) {
        lastError = err;
        this.logger.error(
          `PaymentGateway attempt ${attempt + 1} failed for payment ${request.scheduledPaymentId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    throw lastError;
  }

  private async callGateway(request: PaymentRequest): Promise<PaymentGatewayResult> {
    // MVP stub — real implementation will POST to PSE / payment gateway API
    // using this.configService.get('PAYMENT_GATEWAY_URL') and API key,
    // forwarding request.idempotencyKey as the Idempotency-Key header.
    this.logger.log(
      `PaymentGateway stub: initiating payment for scheduledPaymentId=${request.scheduledPaymentId} idempotencyKey=${request.idempotencyKey}`,
    );

    return {
      externalTransactionId: `mock-txn-${request.scheduledPaymentId}-${Date.now()}`,
      status: 'APPROVED',
      redirectUrl: `https://mock-pse.example.com/pay?key=${request.idempotencyKey}`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
