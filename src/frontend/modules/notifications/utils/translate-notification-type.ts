const NOTIFICATION_TYPE_TRANSLATIONS: Record<string, string> = {
    CONTRACT_SIGNED: 'Contrato firmado',
    PAYMENT_RECEIVED: 'Pago recibido',
    CONTACT_INITIATED: 'Contacto iniciado',
    CONTRACT_UPLOADED: 'Contrato cargado',
    PAYMENT_DUE: 'Pago pendiente',
    NEW_INTEREST: 'Nuevo interesado',
    LEASE_CREATED: 'Arriendo creado',
    LEASE_CANCELLED: 'Arriendo cancelado',
};

function formatFallback(key: string): string {
    return key
        .split('_')
        .map((word, index) =>
            index === 0
                ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                : word.toLowerCase(),
        )
        .join(' ');
}

export function translateNotificationType(name: string): string {
    return NOTIFICATION_TYPE_TRANSLATIONS[name] ?? formatFallback(name);
}
