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

    it('returns the original string for unknown types', () => {
        expect(translateNotificationType('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
    });

    it('returns the original string for an empty string', () => {
        expect(translateNotificationType('')).toBe('');
    });
});
