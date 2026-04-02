type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  halfOpenProbes: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions,
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === 'OPEN') {
      return fallback();
    }

    if (this.state === 'HALF_OPEN') {
      return this.probe(fn, fallback);
    }

    // CLOSED
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private async probe<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch {
      this.trip();
      return fallback();
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'OPEN';
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => {
      this.state = 'HALF_OPEN';
      this.resetTimer = null;
    }, this.options.timeout);
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
