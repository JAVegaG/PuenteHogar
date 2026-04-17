import type { RegistrationFormData } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONLY_LETTERS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
const ONLY_DIGITS_REGEX = /^\d+$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'El correo electrónico es obligatorio';
  if (!EMAIL_REGEX.test(trimmed)) return 'Ingresa un correo electrónico válido (ej. usuario@ejemplo.com)';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'La contraseña es obligatoria';
  if (value.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) return 'Las contraseñas no coinciden';
  return null;
}

export function validateRequired(value: string): string | null {
  if (!value.trim()) return 'Este campo es obligatorio';
  return null;
}

export function validateOnlyLetters(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Este campo es obligatorio';
  if (!ONLY_LETTERS_REGEX.test(trimmed)) return 'Este campo solo admite letras y espacios';
  return null;
}

export function validateAlphanumeric(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'El número de documento es obligatorio';
  if (!ALPHANUMERIC_REGEX.test(trimmed)) return 'El número de documento solo admite letras y números';
  return null;
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'El número de teléfono es obligatorio';
  if (!ONLY_DIGITS_REGEX.test(trimmed)) return 'El teléfono solo admite números';
  if (trimmed.length !== 10) return 'El teléfono debe tener exactamente 10 dígitos';
  return null;
}

export function validateDocumentType(value: string): string | null {
  if (!value) return 'Selecciona un tipo de documento';
  return null;
}

export function validateStep1(data: RegistrationFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.userType) errors.userType = 'Selecciona un tipo de usuario para continuar';
  if (!data.personType) errors.personType = 'Selecciona un tipo de persona para continuar';
  return errors;
}

export function validateStep2(data: RegistrationFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (data.personType === 'natural') {
    const firstNameError = validateOnlyLetters(data.firstName);
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = validateOnlyLetters(data.lastName);
    if (lastNameError) errors.lastName = lastNameError;
    // preferredName is optional — only validate format if provided
    if (data.preferredName.trim()) {
      const prefError = validateOnlyLetters(data.preferredName);
      if (prefError) errors.preferredName = prefError;
    }
  } else if (data.personType === 'legal') {
    const bizError = validateOnlyLetters(data.businessName);
    if (bizError) errors.businessName = bizError;
  }

  const docTypeError = validateDocumentType(data.documentTypeCode);
  if (docTypeError) errors.documentTypeCode = docTypeError;

  const docNumError = validateAlphanumeric(data.documentNumber);
  if (docNumError) errors.documentNumber = docNumError;

  const phoneError = validatePhone(data.phoneNumber);
  if (phoneError) errors.phoneNumber = phoneError;

  return errors;
}

export function validateStep3(data: RegistrationFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(data.mail);
  if (emailError) errors.mail = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  const matchError = validatePasswordMatch(data.password, data.confirmPassword);
  if (matchError) errors.confirmPassword = matchError;

  return errors;
}

export function validateLoginForm(mail: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(mail);
  if (emailError) errors.mail = emailError;

  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  return errors;
}
