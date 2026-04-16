// Feature: backend-database-implementation, Property 48: Circuit Breaker se abre ante fallos repetidos y retorna degradación controlada
// Validates: Requirements 12.1, 12.2

import * as fc from 'fast-check';
import { CircuitBreaker } from './circuit-breaker';

const FAILURE_THRESHOLD = 3;
const TIMEOUT_MS = 30_000;

/** Creates a fresh CircuitBreaker with the standard payment config */
function makeBreaker(): CircuitBreaker {
  return new CircuitBreaker('test-breaker', {
    failureThreshold: FAILURE_THRESHOLD,
    timeout: TIMEOUT_MS,
    halfOpenProbes: 1,
  });
}

/** Simulates a failing external call */
const failingFn = (): Promise<never> => Promise.reject(new Error('external service error'));

/** Controlled degradation fallback — must never throw */
const fallback = (): string => 'DEGRADED';

describe('CircuitBreaker — Property 48: se abre ante fallos repetidos y retorna degradación controlada', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Structural / example-based tests ────────────────────────────────────────

  it('starts in CLOSED state', () => {
    const breaker = makeBreaker();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('transitions to OPEN after exactly failureThreshold consecutive failures', async () => {
    const breaker = makeBreaker();

    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) {
      await expect(breaker.execute(failingFn, fallback)).rejects.toThrow();
      expect(breaker.getState()).toBe('CLOSED');
    }

    // The threshold-th failure trips the breaker
    await expect(breaker.execute(failingFn, fallback)).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');
  });

  it('returns fallback (not throw) when OPEN', async () => {
    const breaker = makeBreaker();

    // Trip the breaker
    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await breaker.execute(failingFn, fallback).catch(() => undefined);
    }
    expect(breaker.getState()).toBe('OPEN');

    // Subsequent calls must return the fallback, not throw
    const result = await breaker.execute(failingFn, fallback);
    expect(result).toBe('DEGRADED');
  });

  it('transitions to HALF_OPEN after timeout elapses', async () => {
    jest.useFakeTimers();
    const breaker = makeBreaker();

    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await breaker.execute(failingFn, fallback).catch(() => undefined);
    }
    expect(breaker.getState()).toBe('OPEN');

    jest.advanceTimersByTime(TIMEOUT_MS + 1);
    expect(breaker.getState()).toBe('HALF_OPEN');
  });

  it('resets to CLOSED when probe succeeds in HALF_OPEN state', async () => {
    jest.useFakeTimers();
    const breaker = makeBreaker();

    for (let i = 0; i < FAILURE_THRESHOLD; i++) {
      await breaker.execute(failingFn, fallback).catch(() => undefined);
    }
    jest.advanceTimersByTime(TIMEOUT_MS + 1);
    expect(breaker.getState()).toBe('HALF_OPEN');

    const successFn = (): Promise<string> => Promise.resolve('OK');
    const result = await breaker.execute(successFn, fallback);
    expect(result).toBe('OK');
    expect(breaker.getState()).toBe('CLOSED');
  });

  // ─── Property-based tests ─────────────────────────────────────────────────────

  /**
   * Property 48 — Circuit Breaker se abre ante fallos repetidos y retorna degradación controlada
   * Validates: Requirements 12.1, 12.2
   *
   * For any number of consecutive failures >= failureThreshold:
   *   1. The circuit breaker transitions to OPEN state
   *   2. While OPEN, calls return the controlled degradation value (never throw)
   *   3. The circuit breaker does NOT propagate failures as unhandled platform crashes
   */
  it('Property 48 — after >= failureThreshold failures the breaker is OPEN and returns degraded response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: FAILURE_THRESHOLD, max: 10 }),
        async (failureCount) => {
          const breaker = makeBreaker();

          // Drive the breaker to OPEN by accumulating failures
          for (let i = 0; i < failureCount; i++) {
            // Swallow the thrown error — we only care about state transitions
            await breaker.execute(failingFn, fallback).catch(() => undefined);
          }

          // After >= failureThreshold failures the breaker MUST be OPEN
          const stateAfterFailures = breaker.getState();
          if (stateAfterFailures !== 'OPEN') return false;

          // While OPEN, execute must return the fallback value without throwing
          let degradedResult: string | undefined;
          let threw = false;
          try {
            degradedResult = await breaker.execute(failingFn, fallback);
          } catch {
            threw = true;
          }

          // Must not throw and must return the controlled degradation value
          return !threw && degradedResult === 'DEGRADED';
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 48 — OPEN breaker never propagates external errors as unhandled exceptions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: FAILURE_THRESHOLD, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        async (failureCount, callsWhileOpen) => {
          const breaker = makeBreaker();

          // Trip the breaker
          for (let i = 0; i < failureCount; i++) {
            await breaker.execute(failingFn, fallback).catch(() => undefined);
          }

          if (breaker.getState() !== 'OPEN') return false;

          // All subsequent calls while OPEN must resolve (not reject)
          for (let i = 0; i < callsWhileOpen; i++) {
            let threw = false;
            try {
              await breaker.execute(failingFn, fallback);
            } catch {
              threw = true;
            }
            if (threw) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
