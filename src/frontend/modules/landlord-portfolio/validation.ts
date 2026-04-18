import type { UnitFormData } from './types';

export function validatePropertyId(value: string): string | null {
  if (value.trim() === '') {
    return 'El ID del inmueble es obligatorio';
  }
  return null;
}

export function validateLeaseBaseAmount(value: string): string | null {
  if (value.trim() === '') {
    return 'El canon base es obligatorio';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 'Ingresa un valor numérico válido';
  }
  if (num < 0) {
    return 'El canon base debe ser mayor o igual a cero';
  }
  return null;
}

export function validateLeaseBaseCurrency(value: string): string | null {
  if (value.trim() === '') {
    return 'La moneda es obligatoria';
  }
  if (!/^[a-zA-Z]{3}$/.test(value)) {
    return 'La moneda debe tener exactamente 3 caracteres (ej. COP)';
  }
  return null;
}

export function validateUnitForm(data: UnitFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  const propertyIdError = validatePropertyId(data.propertyId);
  if (propertyIdError) {
    errors.propertyId = propertyIdError;
  }

  const leaseBaseAmountError = validateLeaseBaseAmount(data.leaseBaseAmount);
  if (leaseBaseAmountError) {
    errors.leaseBaseAmount = leaseBaseAmountError;
  }

  const leaseBaseCurrencyError = validateLeaseBaseCurrency(data.leaseBaseCurrency);
  if (leaseBaseCurrencyError) {
    errors.leaseBaseCurrency = leaseBaseCurrencyError;
  }

  return errors;
}
