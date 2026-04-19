import type { ContractFormData } from './types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContractEmail(value: string): string | null {
    if (!value.trim()) return 'Ingresa un correo electrónico válido';
    if (!EMAIL_REGEX.test(value)) return 'Ingresa un correo electrónico válido';
    return null;
}

export function validateContractPhone(value: string): string | null {
    if (!value.trim()) return 'El teléfono debe tener exactamente 10 dígitos';
    if (!/^\d+$/.test(value)) return 'El teléfono debe tener exactamente 10 dígitos';
    if (value.length !== 10) return 'El teléfono debe tener exactamente 10 dígitos';
    return null;
}

export function validateMonthlyRent(value: string): string | null {
    if (!value.trim()) return 'El canon mensual es obligatorio y debe ser un valor positivo';
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 'El canon mensual es obligatorio y debe ser un valor positivo';
    return null;
}

export function validateContractStep1(data: ContractFormData): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.firstName.trim()) errors.firstName = 'El nombre es obligatorio';
    if (!data.lastName.trim()) errors.lastName = 'El apellido es obligatorio';
    if (!data.documentTypeCode) errors.documentTypeCode = 'Selecciona un tipo de documento';
    if (!data.documentNumber.trim()) errors.documentNumber = 'El número de documento es obligatorio';
    const emailError = validateContractEmail(data.email);
    if (emailError) errors.email = emailError;
    const phoneError = validateContractPhone(data.phoneNumber);
    if (phoneError) errors.phoneNumber = phoneError;
    return errors;
}

export function validateContractStep2(data: ContractFormData): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.startDate) errors.startDate = 'La fecha de inicio es obligatoria';
    if (data.startDate && data.endDate && new Date(data.endDate) <= new Date(data.startDate)) {
        errors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    const rentError = validateMonthlyRent(data.monthlyRent);
    if (rentError) errors.monthlyRent = rentError;
    return errors;
}

export function validateContractStep3(data: ContractFormData): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.file) errors.file = 'Debes seleccionar un archivo PDF para continuar';
    return errors;
}
