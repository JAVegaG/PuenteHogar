import type { UnitFormData, EnrichedUnitFormData } from './types';

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

  return errors;
}

export function validateUnitName(value: string): string | null {
  if (value.trim() === '') {
    return 'El nombre de la unidad es obligatorio';
  }
  return null;
}

export function validateUnitAddress(value: string): string | null {
  if (value.trim() === '') {
    return 'La dirección es obligatoria';
  }
  return null;
}

export function validatePropertyType(value: string): string | null {
  if (value.trim() === '') {
    return 'El tipo de propiedad es obligatorio';
  }
  return null;
}

export function validatePositiveDecimal(value: string, fieldLabel: string): string | null {
  if (value.trim() === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return 'Ingresa un valor válido mayor a cero';
  }
  return null;
}

export function validateNonNegativeInteger(value: string, fieldLabel: string): string | null {
  if (value.trim() === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return 'El valor debe ser cero o mayor';
  }
  return null;
}

export function validateEnrichedUnitForm(data: EnrichedUnitFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameError = validateUnitName(data.name);
  if (nameError) {
    errors.name = nameError;
  }

  const addressError = validateUnitAddress(data.address);
  if (addressError) {
    errors.address = addressError;
  }

  const propertyTypeError = validatePropertyType(data.propertyType);
  if (propertyTypeError) {
    errors.propertyType = propertyTypeError;
  }

  const lengthError = validatePositiveDecimal(data.length, 'Largo');
  if (lengthError) {
    errors.length = lengthError;
  }

  const widthError = validatePositiveDecimal(data.width, 'Ancho');
  if (widthError) {
    errors.width = widthError;
  }

  const roomsError = validateNonNegativeInteger(data.numberOfRooms, 'Habitaciones');
  if (roomsError) {
    errors.numberOfRooms = roomsError;
  }

  const bathroomsError = validateNonNegativeInteger(data.numberOfBathrooms, 'Baños');
  if (bathroomsError) {
    errors.numberOfBathrooms = bathroomsError;
  }

  const leaseBaseAmountError = validateLeaseBaseAmount(data.leaseBaseAmount);
  if (leaseBaseAmountError) {
    errors.leaseBaseAmount = leaseBaseAmountError;
  }

  return errors;
}
