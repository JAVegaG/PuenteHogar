const NOTIFICATION_TYPE_TRANSLATIONS: Record<string, string> = {
    CONTRACT_SIGNED: 'Contrato firmado',
    PAYMENT_RECEIVED: 'Pago recibido',
    CONTACT_INITIATED: 'Contacto iniciado',
    CONTRACT_UPLOADED: 'Contrato cargado',
};

export function translateNotificationType(name: string): string {
    return NOTIFICATION_TYPE_TRANSLATIONS[name] ?? name;
}
