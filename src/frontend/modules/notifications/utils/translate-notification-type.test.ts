import { describe, it, expect } from 'vitest';
import { translateNotificationType } from './translate-notification-type';

describe('translateNotificationType', () => {
    it('translates CONTRACT_SIGNED to "Contrato firmado"', () => {
        expect(translateNotificationType('CONTRACT_SIGNED')).toBe('Contrato firmado');
    });

    it('translates PAYMENT_RECEIVED to "Pago recibido"', () => {
        expect(translateNotificationType('PAYMENT_RECEIVED')).toBe('Pago recibido');
    });

    it('translates CONTACT_INITIATED to "Contacto iniciado"', () => {
        expect(translateNotificationType('CONTACT_INITIATED')).toBe('Contacto iniciado');
    });

    it('translates CONTRACT_UPLOADED to "Contrato cargado"', () => {
        expect(translateNotificationType('CONTRACT_UPLOADED')).toBe('Contrato cargado');
    });

    it('translates PAYMENT_DUE to "Pago pendiente"', () => {
        expect(translateNotificationType('PAYMENT_DUE')).toBe('Pago pendiente');
    });

    it('translates NEW_INTEREST to "Nuevo interesado"', () => {
        expect(translateNotificationType('NEW_INTEREST')).toBe('Nuevo interesado');
    });

    it('formats unknown types: replaces underscores with spaces and title-cases first word', () => {
        expect(translateNotificationType('SOME_NEW_TYPE')).toBe('Some new type');
    });

    it('formats single-word unknown types with title case', () => {
        expect(translateNotificationType('UNKNOWN')).toBe('Unknown');
    });

    it('returns an empty string for an empty string input', () => {
        expect(translateNotificationType('')).toBe('');
    });
});
