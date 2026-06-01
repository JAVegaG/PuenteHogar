/**
 * Centralized status-to-label mappings for the entire application.
 * Use these maps when displaying human-readable status text outside of StatusBadge,
 * or when you need the label programmatically (e.g., for aria-labels, tooltips, filters).
 *
 * StatusBadge already uses its own internal maps for rendering — these utilities
 * are for cases where you need the translated label without the badge component.
 */

// ─── Tracking States (Lease lifecycle) ───────────────────────────────────────

export const TRACKING_STATUS_LABELS: Record<string, string> = {
    PUBLISHED: 'Publicado',
    CONTACT_INITIATED: 'Contacto iniciado',
    CONTRACT_UPLOADED: 'Contrato cargado',
    CONTRACT_SIGNED: 'Contrato firmado',
    PAYMENT_RECEIVED: 'Pago recibido',
};

// ─── Lease Display Status ────────────────────────────────────────────────────

export const LEASE_STATUS_LABELS: Record<string, string> = {
    Vigente: 'Vigente',
    Acordado: 'Acordado',
    Finalizado: 'Finalizado',
};

// ─── Payment Status ──────────────────────────────────────────────────────────

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'Procesando',
    PAID: 'Pagado',
    OVERDUE: 'Vencido',
    REJECTED: 'Rechazado',
};

// ─── Unit Status ─────────────────────────────────────────────────────────────

export const UNIT_STATUS_LABELS: Record<string, string> = {
    Ocupado: 'Ocupado',
    Disponible: 'Disponible',
    Mantenimiento: 'Mantenimiento',
};

// ─── Listing Status ──────────────────────────────────────────────────────────

export const LISTING_STATUS_LABELS: Record<string, string> = {
    Publicada: 'Publicada',
    'Sin publicar': 'Sin publicar',
};

// ─── Contract Status ─────────────────────────────────────────────────────────

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    SIGNATURE_PENDING: 'Firma pendiente',
    SIGNED: 'Firmado',
};

// ─── Notification Status ─────────────────────────────────────────────────────

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
    SENT: 'Enviada',
    FAILED: 'Fallida',
    PENDING: 'Pendiente',
};

// ─── User Roles ──────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
    ADMIN: 'Administrador',
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Translate a raw status key to its human-readable Spanish label.
 * Falls back to the raw key if no mapping exists.
 */
export function translateStatus(
    status: string,
    map: Record<string, string>,
): string {
    return map[status] ?? status;
}

/**
 * Translate a tracking state to its Spanish label.
 * Example: 'CONTRACT_UPLOADED' → 'Contrato cargado'
 */
export function translateTrackingStatus(status: string): string {
    return translateStatus(status, TRACKING_STATUS_LABELS);
}

/**
 * Translate a payment status to its Spanish label.
 * Example: 'OVERDUE' → 'Vencido'
 */
export function translatePaymentStatus(status: string): string {
    return translateStatus(status, PAYMENT_STATUS_LABELS);
}

/**
 * Translate a contract status to its Spanish label.
 * Example: 'SIGNATURE_PENDING' → 'Firma pendiente'
 */
export function translateContractStatus(status: string): string {
    return translateStatus(status, CONTRACT_STATUS_LABELS);
}

/**
 * Translate a user role to its Spanish label.
 * Example: 'LANDLORD' → 'Arrendador'
 */
export function translateRole(role: string): string {
    return translateStatus(role, ROLE_LABELS);
}
