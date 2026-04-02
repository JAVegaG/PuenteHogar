import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from './circuit-breaker';

type IntegrationType = 'payment' | 'signature' | 'messaging';

const CONFIGS: Record<IntegrationType, { failureThreshold: number; timeout: number; halfOpenProbes: number }> = {
  payment: { failureThreshold: 3, timeout: 30000, halfOpenProbes: 1 },
  signature: { failureThreshold: 3, timeout: 15000, halfOpenProbes: 1 },
  messaging: { failureThreshold: 3, timeout: 15000, halfOpenProbes: 1 },
};

@Injectable()
export class CircuitBreakerFactory {
  private readonly instances = new Map<string, CircuitBreaker>();

  create(name: string, type: IntegrationType): CircuitBreaker {
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const options = CONFIGS[type];
    const breaker = new CircuitBreaker(name, options);
    this.instances.set(name, breaker);
    return breaker;
  }
}
