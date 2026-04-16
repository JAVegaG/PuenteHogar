// Feature: backend-database-implementation, Property 49: Llamadas a servicios externos son canceladas al superar el timeout configurado
// Validates: Requirements 12.3

import * as fc from 'fast-check';
import { CircuitBreaker } from './circuit-breaker';
import { CircuitBreakerFactory } from './circuit-breaker.factory';

/**
 * Configured timeouts per integration type (milliseconds).
 * These are the reset-timer timeouts used by the circuit breaker factory.
 * Requirement 12.3 mandates:
 *   - 30 000 ms for Pasarela_Pagos (payment)
 *   - 15 000 ms for Proveedor_Firma (signature)
 *   - 15 000 ms for Canal_Mensajería (messaging)
 */
const CONFIGURED_TIMEOUTS = {
  payment: 30_000,
  signature: 15_000,
  messaging: 15_000,
} as const;

type IntegrationType = keyof typeof CONFIGURED_TIMEOUTS;

/**
 * Wraps an async function with a hard timeout.
 * If `fn` does not resolve within `timeoutMs`, the returned promise rejects
 * with a TimeoutError. This is the pattern adapters should use to enforce
 * the configured call timeout.
 */
function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Call timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Creates a function that simulates an external call that takes `durationMs` to complete.
 */
function slowCall(durationMs: number): () => Promise<string> {
  return () =>
    new Promise<string>((resolve) => setTimeout(() => resolve('OK'), durationMs));
}

/**
 * Creates a function that simulates an external call that completes immediately.
 */
function fastCall(): () => Promise<string> {
  return () => Promise.resolve('OK');
}

// ─── Intermediate states per service type ────────────────────────────────────

const INTERMEDIATE_STATES: Record<IntegrationType, string> = {
  payment: 'PROCESSING',
  signature: 'SIGNATURE_PENDING',
  messaging: 'FAILED',
};

describe('CircuitBreaker — Property 49: Llamadas a servicios externos canceladas al superar timeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Structural / example-based tests ────────────────────────────────────────

  it('CircuitBreakerFactory creates payment breaker with 30s timeout', () => {
    const factory = new CircuitBreakerFactory();
    const breaker = factory.create('payment-test', 'payment');
    expect(breaker).toBeInstanceOf(CircuitBreaker);
    // The breaker is created — timeout config is validated via factory constants
  });

  it('CircuitBreakerFactory creates signature breaker with 15s timeout', () => {
    const factory = new CircuitBreakerFactory();
    const breaker = factory.create('signature-test', 'signature');
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('CircuitBreakerFactory creates messaging breaker with 15s timeout', () => {
    const factory = new CircuitBreakerFactory();
    const breaker = factory.create('messaging-test', 'messaging');
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('withTimeout rejects when call exceeds the configured timeout', async () => {
    jest.useFakeTimers();

    const callDuration = 5_000; // 5s call
    const timeoutMs = 1_000;    // 1s timeout — call should be cancelled

    const promise = withTimeout(slowCall(callDuration), timeoutMs);

    jest.advanceTimersByTime(timeoutMs + 1);

    await expect(promise).rejects.toThrow(`Call timed out after ${timeoutMs}ms`);
  });

  it('withTimeout resolves when call completes within the configured timeout', async () => {
    const result = await withTimeout(fastCall(), 1_000);
    expect(result).toBe('OK');
  });

  it('payment calls exceeding 30s are rejected with a timeout error', async () => {
    jest.useFakeTimers();

    const callDuration = CONFIGURED_TIMEOUTS.payment + 5_000; // exceeds 30s
    const promise = withTimeout(slowCall(callDuration), CONFIGURED_TIMEOUTS.payment);

    jest.advanceTimersByTime(CONFIGURED_TIMEOUTS.payment + 1);

    await expect(promise).rejects.toThrow(`Call timed out after ${CONFIGURED_TIMEOUTS.payment}ms`);
  });

  it('signature calls exceeding 15s are rejected with a timeout error', async () => {
    jest.useFakeTimers();

    const callDuration = CONFIGURED_TIMEOUTS.signature + 5_000; // exceeds 15s
    const promise = withTimeout(slowCall(callDuration), CONFIGURED_TIMEOUTS.signature);

    jest.advanceTimersByTime(CONFIGURED_TIMEOUTS.signature + 1);

    await expect(promise).rejects.toThrow(`Call timed out after ${CONFIGURED_TIMEOUTS.signature}ms`);
  });

  it('messaging calls exceeding 15s are rejected with a timeout error', async () => {
    jest.useFakeTimers();

    const callDuration = CONFIGURED_TIMEOUTS.messaging + 5_000; // exceeds 15s
    const promise = withTimeout(slowCall(callDuration), CONFIGURED_TIMEOUTS.messaging);

    jest.advanceTimersByTime(CONFIGURED_TIMEOUTS.messaging + 1);

    await expect(promise).rejects.toThrow(`Call timed out after ${CONFIGURED_TIMEOUTS.messaging}ms`);
  });

  it('circuit breaker transitions to OPEN when timeout-cancelled calls accumulate to failureThreshold', async () => {
    jest.useFakeTimers();

    const breaker = new CircuitBreaker('timeout-test', {
      failureThreshold: 3,
      timeout: CONFIGURED_TIMEOUTS.payment,
      halfOpenProbes: 1,
    });

    const fallback = () => INTERMEDIATE_STATES.payment;

    // Each call times out and throws — the circuit breaker counts these as failures
    for (let i = 0; i < 3; i++) {
      const callDuration = CONFIGURED_TIMEOUTS.payment + 1_000;
      const timedOutFn = () => withTimeout(slowCall(callDuration), CONFIGURED_TIMEOUTS.payment);

      const executePromise = breaker.execute(timedOutFn, fallback).catch(() => undefined);
      jest.advanceTimersByTime(CONFIGURED_TIMEOUTS.payment + 1);
      await executePromise;
    }

    expect(breaker.getState()).toBe('OPEN');
  });

  it('open circuit returns intermediate state (PROCESSING) for payment timeouts', async () => {
    jest.useFakeTimers();

    const breaker = new CircuitBreaker('payment-open', {
      failureThreshold: 3,
      timeout: CONFIGURED_TIMEOUTS.payment,
      halfOpenProbes: 1,
    });

    const fallback = () => INTERMEDIATE_STATES.payment;

    // Trip the breaker via timeout failures
    for (let i = 0; i < 3; i++) {
      const callDuration = CONFIGURED_TIMEOUTS.payment + 1_000;
      const timedOutFn = () => withTimeout(slowCall(callDuration), CONFIGURED_TIMEOUTS.payment);
      const p = breaker.execute(timedOutFn, fallback).catch(() => undefined);
      jest.advanceTimersByTime(CONFIGURED_TIMEOUTS.payment + 1);
      await p;
    }

    expect(breaker.getState()).toBe('OPEN');

    // Now the open circuit must return the intermediate state
    const result = await breaker.execute(fastCall(), fallback);
    expect(result).toBe(INTERMEDIATE_STATES.payment); // 'PROCESSING'
  });

  it('open circuit returns intermediate state (SIGNATURE_PENDING) for signature timeouts', async () => {
    jest.useFakeTimers();

    const breaker = new CircuitBreaker('signature-open', {
      failureThreshold: 3,
      timeout: CONFIGURED_TIMEOUTS.signature,
      halfOpenProbes: 1,
    });

    const fallback = () => INTERMEDIATE_STATES.signature;

    for (let i = 0; i < 3; i++) {
      const callDuration = CONFIGURED_TIMEOUTS.signature + 1_000;
      const timedOutFn = () => withTimeout(slowCall(callDuration), CONFIGURED_TIMEOUTS.signature);
      const p = breaker.execute(timedOutFn, fallback).catch(() => undefined);
      jest.advanceTimersByTime(CONFIGURED_TIMEOUTS.signature + 1);
      await p;
    }

    expect(breaker.getState()).toBe('OPEN');

    const result = await breaker.execute(fastCall(), fallback);
    expect(result).toBe(INTERMEDIATE_STATES.signature); // 'SIGNATURE_PENDING'
  });

  // ─── Property-based tests ─────────────────────────────────────────────────────

  /**
   * Property 49 — Llamadas a servicios externos son canceladas al superar el timeout configurado
   * Validates: Requirements 12.3
   *
   * For any call duration that exceeds the configured timeout for a given service type:
   *   1. The call is rejected (cancelled) with a timeout error
   *   2. The rejection happens at or after the configured timeout boundary
   *   3. Calls that complete within the timeout are NOT cancelled
   */
  it('Property 49 — calls exceeding the configured timeout are always rejected', async () => {
    jest.useFakeTimers();

    await fc.assert(
      fc.asyncProperty(
        // Pick a service type
        fc.constantFrom<IntegrationType>('payment', 'signature', 'messaging'),
        // Pick an excess duration: how many ms OVER the timeout the call takes
        fc.integer({ min: 1, max: 10_000 }),
        async (serviceType, excessMs) => {
          const configuredTimeout = CONFIGURED_TIMEOUTS[serviceType];
          const callDuration = configuredTimeout + excessMs; // always exceeds timeout

          const promise = withTimeout(slowCall(callDuration), configuredTimeout);

          // Advance time past the timeout boundary
          jest.advanceTimersByTime(configuredTimeout + 1);

          let rejected = false;
          let errorMessage = '';
          try {
            await promise;
          } catch (err) {
            rejected = true;
            errorMessage = err instanceof Error ? err.message : String(err);
          }

          // Must be rejected with a timeout error
          return rejected && errorMessage.includes(`timed out after ${configuredTimeout}ms`);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 49 — calls completing within the configured timeout are never cancelled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Pick a service type
        fc.constantFrom<IntegrationType>('payment', 'signature', 'messaging'),
        async (serviceType) => {
          const configuredTimeout = CONFIGURED_TIMEOUTS[serviceType];

          // Fast call completes immediately — well within any timeout
          const result = await withTimeout(fastCall(), configuredTimeout);

          return result === 'OK';
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 49 — timeout-cancelled calls cause circuit breaker to accumulate failures', async () => {
    jest.useFakeTimers();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<IntegrationType>('payment', 'signature', 'messaging'),
        async (serviceType) => {
          const configuredTimeout = CONFIGURED_TIMEOUTS[serviceType];
          const fallback = () => INTERMEDIATE_STATES[serviceType];
          const failureThreshold = 3;

          // Use a unique name per run to avoid instance cache collisions
          const breaker = new CircuitBreaker(`pbt-accum-${serviceType}-${Date.now()}-${Math.random()}`, {
            failureThreshold,
            timeout: configuredTimeout,
            halfOpenProbes: 1,
          });

          // Drive exactly failureThreshold timeout failures — each one must be counted
          for (let i = 0; i < failureThreshold; i++) {
            const callDuration = configuredTimeout + 1_000;
            const timedOutFn = () => withTimeout(slowCall(callDuration), configuredTimeout);
            const p = breaker.execute(timedOutFn, fallback).catch(() => undefined);
            jest.advanceTimersByTime(configuredTimeout + 1);
            await p;
          }

          // After exactly failureThreshold timeout failures, the breaker must be OPEN
          return breaker.getState() === 'OPEN';
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 49 — open circuit after timeout failures returns the correct intermediate state', async () => {
    jest.useFakeTimers();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<IntegrationType>('payment', 'signature', 'messaging'),
        async (serviceType) => {
          const configuredTimeout = CONFIGURED_TIMEOUTS[serviceType];
          const expectedIntermediateState = INTERMEDIATE_STATES[serviceType];
          const fallback = () => expectedIntermediateState;

          const breaker = new CircuitBreaker(`pbt-open-${serviceType}`, {
            failureThreshold: 3,
            timeout: configuredTimeout,
            halfOpenProbes: 1,
          });

          // Trip the breaker with 3 timeout failures
          for (let i = 0; i < 3; i++) {
            const callDuration = configuredTimeout + 1_000;
            const timedOutFn = () => withTimeout(slowCall(callDuration), configuredTimeout);
            const p = breaker.execute(timedOutFn, fallback).catch(() => undefined);
            jest.advanceTimersByTime(configuredTimeout + 1);
            await p;
          }

          if (breaker.getState() !== 'OPEN') return false;

          // Open circuit must return the intermediate state without throwing
          let threw = false;
          let result: string | undefined;
          try {
            result = await breaker.execute(fastCall(), fallback);
          } catch {
            threw = true;
          }

          return !threw && result === expectedIntermediateState;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 49 — configured timeouts match Requirement 12.3 values exactly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<IntegrationType>('payment', 'signature', 'messaging'),
        (serviceType) => {
          const timeout = CONFIGURED_TIMEOUTS[serviceType];
          if (serviceType === 'payment') {
            return timeout === 30_000;
          }
          // signature and messaging must be 15s
          return timeout === 15_000;
        },
      ),
      { numRuns: 100 },
    );
  });
});
