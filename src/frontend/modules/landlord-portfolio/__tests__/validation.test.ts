import { describe, it, expect } from 'vitest';
import {
  validatePropertyId,
  validateLeaseBaseAmount,
  validateLeaseBaseCurrency,
  validateUnitForm,
} from '../validation';

describe('validatePropertyId', () => {
  it('returns null for a non-empty string', () => {
    expect(validatePropertyId('abc')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(validatePropertyId('')).toBe('El ID del inmueble es obligatorio');
  });

  it('returns error for whitespace-only string', () => {
    expect(validatePropertyId('   ')).toBe('El ID del inmueble es obligatorio');
  });

  it('returns null for string with leading/trailing spaces but non-empty content', () => {
    expect(validatePropertyId('  x  ')).toBeNull();
  });
});

describe('validateLeaseBaseAmount', () => {
  it('returns null for valid positive number', () => {
    expect(validateLeaseBaseAmount('1200000')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(validateLeaseBaseAmount('0')).toBeNull();
  });

  it('returns null for decimal number', () => {
    expect(validateLeaseBaseAmount('99.5')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(validateLeaseBaseAmount('')).toBe('El canon base es obligatorio');
  });

  it('returns error for whitespace-only string', () => {
    expect(validateLeaseBaseAmount('   ')).toBe('El canon base es obligatorio');
  });

  it('returns error for non-numeric string', () => {
    expect(validateLeaseBaseAmount('abc')).toBe('Ingresa un valor numérico válido');
  });

  it('returns error for Infinity', () => {
    expect(validateLeaseBaseAmount('Infinity')).toBe('Ingresa un valor numérico válido');
  });

  it('returns error for negative number', () => {
    expect(validateLeaseBaseAmount('-5')).toBe('El canon base debe ser mayor o igual a cero');
  });
});

describe('validateLeaseBaseCurrency', () => {
  it('returns null for exactly 3 alpha chars (uppercase)', () => {
    expect(validateLeaseBaseCurrency('COP')).toBeNull();
  });

  it('returns null for exactly 3 alpha chars (lowercase)', () => {
    expect(validateLeaseBaseCurrency('usd')).toBeNull();
  });

  it('returns null for mixed case', () => {
    expect(validateLeaseBaseCurrency('Eur')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(validateLeaseBaseCurrency('')).toBe('La moneda es obligatoria');
  });

  it('returns error for 2 chars', () => {
    expect(validateLeaseBaseCurrency('CO')).toBe(
      'La moneda debe tener exactamente 3 caracteres (ej. COP)'
    );
  });

  it('returns error for 4 chars', () => {
    expect(validateLeaseBaseCurrency('COPE')).toBe(
      'La moneda debe tener exactamente 3 caracteres (ej. COP)'
    );
  });

  it('returns error for digits', () => {
    expect(validateLeaseBaseCurrency('123')).toBe(
      'La moneda debe tener exactamente 3 caracteres (ej. COP)'
    );
  });
});

describe('validateUnitForm', () => {
  it('returns empty object for valid data', () => {
    const errors = validateUnitForm({
      propertyId: 'prop-1',
      leaseBaseAmount: '1200000',
      leaseBaseCurrency: 'COP',
      conditions: '',
    });
    expect(errors).toEqual({});
  });

  it('aggregates errors for all invalid fields', () => {
    const errors = validateUnitForm({
      propertyId: '',
      leaseBaseAmount: '',
      leaseBaseCurrency: '',
      conditions: '',
    });
    expect(errors).toEqual({
      propertyId: 'El ID del inmueble es obligatorio',
      leaseBaseAmount: 'El canon base es obligatorio',
    });
  });

  it('does not validate conditions field', () => {
    const errors = validateUnitForm({
      propertyId: 'prop-1',
      leaseBaseAmount: '100',
      leaseBaseCurrency: 'COP',
      conditions: '',
    });
    expect(errors).not.toHaveProperty('conditions');
  });
});
