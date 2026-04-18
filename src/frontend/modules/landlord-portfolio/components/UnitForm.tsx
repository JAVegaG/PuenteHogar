'use client';

import { useState } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { validateUnitForm } from '../validation';
import { portfolioService } from '@/shared/services/portfolio';
import type { PortfolioUnit, UnitFormData, UpdatePortfolioUnitRequest } from '../types';
import { Button } from '@/shared/components/Button';

/** Format a raw numeric string as COP display: "120000" → "$120.000" */
function formatCOP(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return '$' + Number(digits).toLocaleString('es-CO');
}

/** Strip formatting back to digits only */
function stripCOP(display: string): string {
  return display.replace(/\D/g, '');
}

interface UnitFormProps {
  mode: 'create' | 'edit';
  portfolioId: string;
  initialData?: PortfolioUnit;
  onSuccess: () => void;
}

function buildInitialFormData(mode: 'create' | 'edit', initialData?: PortfolioUnit): UnitFormData {
  if (mode === 'edit' && initialData) {
    return {
      propertyId: initialData.propertyId,
      leaseBaseAmount: String(initialData.leaseBaseAmount),
      leaseBaseCurrency: initialData.leaseBaseCurrency,
      conditions: initialData.conditions ?? '',
    };
  }
  return {
    propertyId: '',
    leaseBaseAmount: '',
    leaseBaseCurrency: 'COP',
    conditions: '',
  };
}

export function computeDiff(
  initialData: PortfolioUnit,
  formData: UnitFormData
): UpdatePortfolioUnitRequest {
  const diff: UpdatePortfolioUnitRequest = {};

  if (formData.leaseBaseAmount !== String(initialData.leaseBaseAmount)) {
    diff.leaseBaseAmount = Number(formData.leaseBaseAmount);
  }
  if (formData.conditions !== (initialData.conditions ?? '')) {
    diff.conditions = formData.conditions;
  }

  return diff;
}

export function UnitForm({ mode, portfolioId, initialData, onSuccess }: UnitFormProps) {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState<UnitFormData>(() =>
    buildInitialFormData(mode, initialData)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof UnitFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleLeaseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = stripCOP(e.target.value);
    handleChange('leaseBaseAmount', stripped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateUnitForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const token = user?.accessToken;
    if (!token) {
      logout();
      return;
    }

    try {
      if (mode === 'create') {
        await portfolioService.createUnit(
          portfolioId,
          {
            propertyId: formData.propertyId,
            leaseBaseAmount: Number(formData.leaseBaseAmount),
            leaseBaseCurrency: 'COP',
            conditions: formData.conditions || undefined,
          },
          token
        );
      } else {
        const diffPayload = computeDiff(initialData!, formData);
        await portfolioService.updateUnit(portfolioId, initialData!.id, diffPayload, token);
      }
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      if (message === 'Sesión expirada') {
        logout();
        return;
      }
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldBorderClass = (field: string) =>
    errors[field]
      ? 'border-red-600 focus:ring-red-600'
      : 'border-gray-300 focus:ring-primary';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 p-3 text-caption text-red-700"
        >
          {serverError}
        </div>
      )}

      <div>
        <label
          htmlFor="propertyId"
          className="block text-caption font-medium text-gray-700 mb-1"
        >
          ID del inmueble
        </label>
        <input
          id="propertyId"
          type="text"
          value={formData.propertyId}
          onChange={(e) => handleChange('propertyId', e.target.value)}
          readOnly={mode === 'edit'}
          aria-describedby={errors.propertyId ? 'propertyId-error' : undefined}
          className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('propertyId')} ${mode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {errors.propertyId && (
          <p
            id="propertyId-error"
            aria-live="polite"
            className="mt-1 text-[14px] text-red-600"
          >
            {errors.propertyId}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="leaseBaseAmount"
          className="block text-caption font-medium text-gray-700 mb-1"
        >
          Canon base de arrendamiento (COP)
        </label>
        <input
          id="leaseBaseAmount"
          type="text"
          inputMode="numeric"
          value={formatCOP(formData.leaseBaseAmount)}
          onChange={handleLeaseAmountChange}
          placeholder="$0"
          aria-describedby={errors.leaseBaseAmount ? 'leaseBaseAmount-error' : undefined}
          className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('leaseBaseAmount')}`}
        />
        {errors.leaseBaseAmount && (
          <p
            id="leaseBaseAmount-error"
            aria-live="polite"
            className="mt-1 text-[14px] text-red-600"
          >
            {errors.leaseBaseAmount}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="conditions"
          className="block text-caption font-medium text-gray-700 mb-1"
        >
          Condiciones especiales (opcional)
        </label>
        <textarea
          id="conditions"
          value={formData.conditions}
          onChange={(e) => handleChange('conditions', e.target.value)}
          rows={3}
          className="w-full min-h-[44px] rounded-[10px] border border-gray-300 px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Guardando...
          </span>
        ) : mode === 'create' ? (
          'Guardar unidad'
        ) : (
          'Guardar cambios'
        )}
      </Button>
    </form>
  );
}
