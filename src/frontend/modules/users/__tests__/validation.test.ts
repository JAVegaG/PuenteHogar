import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  validateOnlyLetters,
  validateAlphanumeric,
  validatePhone,
  validateDocumentType,
  validateStep1,
  validateStep2,
  validateStep3,
  validateLoginForm,
} from '../validation';
import type { RegistrationFormData } from '../types';

const emptyFormData: RegistrationFormData = {
  userType: '',
  personType: '',
  firstName: '',
  lastName: '',
  preferredName: '',
  businessName: '',
  documentTypeCode: '',
  documentNumber: '',
  phoneNumber: '',
  mail: '',
  password: '',
  confirmPassword: '',
};

describe('validateEmail', () => {
  it('returns error for empty string', () => {
    expect(validateEmail('')).toBe('El correo electrónico es obligatorio');
  });
  it('returns error for whitespace-only', () => {
    expect(validateEmail('   ')).toBe('El correo electrónico es obligatorio');
  });
  it('returns error for invalid format', () => {
    expect(validateEmail('noarroba')).toBe('Ingresa un correo electrónico válido (ej. usuario@ejemplo.com)');
  });
  it('returns null for valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('returns error for empty string', () => {
    expect(validatePassword('')).toBe('La contraseña es obligatoria');
  });
  it('returns error for short password', () => {
    expect(validatePassword('abc')).toBe('La contraseña debe tener al menos 8 caracteres');
  });
  it('returns null for 8+ chars', () => {
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('validatePasswordMatch', () => {
  it('returns null when passwords match', () => {
    expect(validatePasswordMatch('abc123!@', 'abc123!@')).toBeNull();
  });
  it('returns error when passwords differ', () => {
    expect(validatePasswordMatch('abc', 'xyz')).toBe('Las contraseñas no coinciden');
  });
});

describe('validateRequired', () => {
  it('returns error for empty', () => {
    expect(validateRequired('')).toBe('Este campo es obligatorio');
  });
  it('returns null for non-empty', () => {
    expect(validateRequired('hello')).toBeNull();
  });
});

describe('validateOnlyLetters', () => {
  it('returns error for empty', () => {
    expect(validateOnlyLetters('')).toBe('Este campo es obligatorio');
  });
  it('returns error for numbers', () => {
    expect(validateOnlyLetters('Juan123')).toBe('Este campo solo admite letras y espacios');
  });
  it('returns null for letters and spaces', () => {
    expect(validateOnlyLetters('Juan Carlos')).toBeNull();
  });
  it('accepts accented characters', () => {
    expect(validateOnlyLetters('María José')).toBeNull();
  });
});

describe('validateAlphanumeric', () => {
  it('returns error for empty', () => {
    expect(validateAlphanumeric('')).toBe('El número de documento es obligatorio');
  });
  it('returns error for special chars', () => {
    expect(validateAlphanumeric('123-456')).toBe('El número de documento solo admite letras y números');
  });
  it('returns null for alphanumeric', () => {
    expect(validateAlphanumeric('ABC123')).toBeNull();
  });
});

describe('validatePhone', () => {
  it('returns error for empty', () => {
    expect(validatePhone('')).toBe('El número de teléfono es obligatorio');
  });
  it('returns error for non-digits', () => {
    expect(validatePhone('312abc4567')).toBe('El teléfono solo admite números');
  });
  it('returns error for wrong length', () => {
    expect(validatePhone('12345')).toBe('El teléfono debe tener exactamente 10 dígitos');
  });
  it('returns null for exactly 10 digits', () => {
    expect(validatePhone('3121234567')).toBeNull();
  });
});

describe('validateDocumentType', () => {
  it('returns error for empty', () => {
    expect(validateDocumentType('')).toBe('Selecciona un tipo de documento');
  });
  it('returns null for selected value', () => {
    expect(validateDocumentType('CC')).toBeNull();
  });
});

describe('validateStep1', () => {
  it('returns errors when nothing selected', () => {
    const errors = validateStep1(emptyFormData);
    expect(errors.userType).toBe('Selecciona un tipo de usuario para continuar');
    expect(errors.personType).toBe('Selecciona un tipo de persona para continuar');
  });
  it('returns empty when both selected', () => {
    const data = { ...emptyFormData, userType: 'LANDLORD' as const, personType: 'natural' as const };
    expect(validateStep1(data)).toEqual({});
  });
});

describe('validateStep2', () => {
  it('validates natural person fields', () => {
    const data: RegistrationFormData = { ...emptyFormData, personType: 'natural' };
    const errors = validateStep2(data);
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.documentTypeCode).toBeDefined();
    expect(errors.documentNumber).toBeDefined();
    expect(errors.phoneNumber).toBeDefined();
  });
  it('validates legal person fields', () => {
    const data: RegistrationFormData = { ...emptyFormData, personType: 'legal' };
    const errors = validateStep2(data);
    expect(errors.businessName).toBeDefined();
    expect(errors.firstName).toBeUndefined();
  });
  it('skips preferredName validation when empty', () => {
    const data: RegistrationFormData = {
      ...emptyFormData,
      personType: 'natural',
      firstName: 'Juan',
      lastName: 'Pérez',
      documentTypeCode: 'CC',
      documentNumber: '123456',
      phoneNumber: '3121234567',
    };
    const errors = validateStep2(data);
    expect(errors.preferredName).toBeUndefined();
  });
  it('validates preferredName format when provided', () => {
    const data: RegistrationFormData = {
      ...emptyFormData,
      personType: 'natural',
      firstName: 'Juan',
      lastName: 'Pérez',
      preferredName: '123',
      documentTypeCode: 'CC',
      documentNumber: '123456',
      phoneNumber: '3121234567',
    };
    const errors = validateStep2(data);
    expect(errors.preferredName).toBe('Este campo solo admite letras y espacios');
  });
});

describe('validateStep3', () => {
  it('returns errors for empty fields', () => {
    const errors = validateStep3(emptyFormData);
    expect(errors.mail).toBeDefined();
    expect(errors.password).toBeDefined();
  });
  it('validates password match', () => {
    const data: RegistrationFormData = {
      ...emptyFormData,
      mail: 'user@example.com',
      password: '12345678',
      confirmPassword: 'different',
    };
    const errors = validateStep3(data);
    expect(errors.confirmPassword).toBe('Las contraseñas no coinciden');
  });
  it('returns empty for valid step 3', () => {
    const data: RegistrationFormData = {
      ...emptyFormData,
      mail: 'user@example.com',
      password: '12345678',
      confirmPassword: '12345678',
    };
    expect(validateStep3(data)).toEqual({});
  });
});

describe('validateLoginForm', () => {
  it('returns errors for empty fields', () => {
    const errors = validateLoginForm('', '');
    expect(errors.mail).toBe('El correo electrónico es obligatorio');
    expect(errors.password).toBe('La contraseña es obligatoria');
  });
  it('returns empty for valid login', () => {
    expect(validateLoginForm('user@example.com', '12345678')).toEqual({});
  });
});
