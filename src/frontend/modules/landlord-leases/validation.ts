const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeaseEmail(email: string): string | null {
    const trimmed = email.trim();
    if (!trimmed) {
        return 'El correo electrónico es obligatorio';
    }
    if (!EMAIL_REGEX.test(trimmed)) {
        return 'Ingresa un correo electrónico válido';
    }
    return null;
}

export function validateLeaseForm(data: {
    tenantEmail: string;
    startDate: string;
    endDate: string;
}): Record<string, string> {
    const errors: Record<string, string> = {};

    const emailError = validateLeaseEmail(data.tenantEmail);
    if (emailError) {
        errors.tenantEmail = emailError;
    }

    if (!data.startDate.trim()) {
        errors.startDate = 'La fecha de inicio es obligatoria';
    }

    if (data.endDate.trim() && data.startDate.trim()) {
        const end = new Date(data.endDate.trim());
        const start = new Date(data.startDate.trim());
        if (end <= start) {
            errors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
        }
    }

    return errors;
}
