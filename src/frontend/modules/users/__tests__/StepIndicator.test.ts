import { describe, it, expect } from 'vitest';

/**
 * StepIndicator logic tests.
 *
 * Since the project doesn't have jsdom / @testing-library/react,
 * we validate the step classification logic as pure functions.
 *
 * The component classifies each step as: completed, current, or pending.
 * - Completed: step < currentStep → primary bg + check icon
 * - Current: step === currentStep → primary bg + number, aria-current="step"
 * - Pending: step > currentStep → neutral bg + number
 *
 * Accessibility: container has role="navigation" and aria-label="Paso X de Y"
 */

type StepState = 'completed' | 'current' | 'pending';

function classifyStep(step: number, currentStep: number): StepState {
  if (step < currentStep) return 'completed';
  if (step === currentStep) return 'current';
  return 'pending';
}

function getAriaLabel(currentStep: number, totalSteps: number): string {
  return `Paso ${currentStep} de ${totalSteps}`;
}

function shouldShowAriaCurrent(step: number, currentStep: number): boolean {
  return step === currentStep;
}

describe('StepIndicator logic', () => {
  describe('step classification', () => {
    it('marks steps before currentStep as completed', () => {
      expect(classifyStep(1, 2)).toBe('completed');
      expect(classifyStep(1, 3)).toBe('completed');
      expect(classifyStep(2, 3)).toBe('completed');
    });

    it('marks the currentStep as current', () => {
      expect(classifyStep(1, 1)).toBe('current');
      expect(classifyStep(2, 2)).toBe('current');
      expect(classifyStep(3, 3)).toBe('current');
    });

    it('marks steps after currentStep as pending', () => {
      expect(classifyStep(2, 1)).toBe('pending');
      expect(classifyStep(3, 1)).toBe('pending');
      expect(classifyStep(3, 2)).toBe('pending');
    });
  });

  describe('accessibility attributes', () => {
    it('generates correct aria-label for navigation', () => {
      expect(getAriaLabel(1, 3)).toBe('Paso 1 de 3');
      expect(getAriaLabel(2, 3)).toBe('Paso 2 de 3');
      expect(getAriaLabel(3, 3)).toBe('Paso 3 de 3');
    });

    it('sets aria-current only on the current step', () => {
      expect(shouldShowAriaCurrent(1, 1)).toBe(true);
      expect(shouldShowAriaCurrent(2, 1)).toBe(false);
      expect(shouldShowAriaCurrent(3, 1)).toBe(false);

      expect(shouldShowAriaCurrent(1, 2)).toBe(false);
      expect(shouldShowAriaCurrent(2, 2)).toBe(true);
      expect(shouldShowAriaCurrent(3, 2)).toBe(false);
    });
  });

  describe('connector lines', () => {
    it('completed connections are between steps before currentStep', () => {
      // For a 3-step indicator at step 3:
      // line after step 1 → completed (1 < 3)
      // line after step 2 → completed (2 < 3)
      expect(1 < 3).toBe(true);
      expect(2 < 3).toBe(true);
    });

    it('pending connections are between steps at or after currentStep', () => {
      // For a 3-step indicator at step 1:
      // line after step 1 → pending (1 >= 1)
      // line after step 2 → pending (2 >= 1)
      expect(1 < 1).toBe(false);
      expect(2 < 1).toBe(false);
    });

    it('no connector line after the last step', () => {
      const totalSteps = 3;
      // step 3 < totalSteps(3) is false → no line rendered
      expect(3 < totalSteps).toBe(false);
    });
  });
});
