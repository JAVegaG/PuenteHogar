import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IESignatureProvider,
  SigningRequest,
  SigningResult,
} from '../../domain/ports/e-signature-provider.port';

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;

/**
 * Adapter for the external e-signature provider.
 *
 * Retry policy: up to 2 retries with exponential backoff (500ms, 1000ms).
 * Circuit breaker (timeout 15s, failureThreshold 3) is applied by the
 * calling use case via CircuitBreakerFactory — this adapter only handles
 * the retry logic so transient failures don't immediately count as circuit failures.
 */
@Injectable()
export class ESignatureProviderAdapter implements IESignatureProvider {
  private readonly logger = new Logger(ESignatureProviderAdapter.name);

  // ConfigService kept for future real provider configuration (API key, base URL, etc.)
  constructor(private readonly configService: ConfigService) {}

  async initiateSigningSession(request: SigningRequest): Promise<SigningResult> {
    return this.callWithRetry(request);
  }

  private async callWithRetry(request: SigningRequest): Promise<SigningResult> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1); // 500ms → 1000ms
        this.logger.warn(
          `ESignatureProvider retry ${attempt}/${MAX_RETRIES} for contract ${request.contractId} — waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      try {
        return await this.callProvider(request);
      } catch (err) {
        lastError = err;
        this.logger.error(
          `ESignatureProvider attempt ${attempt + 1} failed for contract ${request.contractId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    throw lastError;
  }

  private async callProvider(request: SigningRequest): Promise<SigningResult> {
    // MVP stub — real implementation will POST to external e-signature provider API
    // using this.configService.get('E_SIGNATURE_API_URL') and API key
    return {
      externalId: `mock-signing-${request.contractId}-${Date.now()}`,
      status: 'INITIATED',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
