interface ColorMapping {
    bg: string;
    text: string;
}

const leaseColors: Record<string, ColorMapping> = {
    Vigente: { bg: '#DCFCE7', text: '#166534' },
    Acordado: { bg: '#DBEAFE', text: '#1E40AF' },
    Finalizado: { bg: '#F3F4F6', text: '#4B5563' },
};

const unitColors: Record<string, ColorMapping> = {
    Ocupado: { bg: '#FEF3C7', text: '#92400E' },
    Disponible: { bg: '#DCFCE7', text: '#166534' },
    Mantenimiento: { bg: '#FEE2E2', text: '#991B1B' },
};

const paymentColors: Record<string, ColorMapping> = {
    'Al día': { bg: '#DCFCE7', text: '#166534' },
    Pendiente: { bg: '#FEF3C7', text: '#92400E' },
};

const listingColors: Record<string, ColorMapping> = {
    Publicada: { bg: '#DBEAFE', text: '#1E40AF' },
    'Sin publicar': { bg: '#F3F4F6', text: '#4B5563' },
};

const variantMap: Record<string, Record<string, ColorMapping>> = {
    lease: leaseColors,
    unit: unitColors,
    payment: paymentColors,
    listing: listingColors,
};

const defaultColor: ColorMapping = { bg: '#F3F4F6', text: '#4B5563' };

interface StatusBadgeProps {
    status: string;
    variant?: 'lease' | 'unit' | 'payment' | 'listing';
}

export function StatusBadge({ status, variant = 'lease' }: StatusBadgeProps) {
    const colors = variantMap[variant]?.[status] ?? defaultColor;

    return (
        <span
            aria-label={`Estado: ${status}`}
            className="text-small font-medium inline-block rounded-[4px] px-[8px] py-[2px]"
            style={{ backgroundColor: colors.bg, color: colors.text }}
        >
            {status}
        </span>
    );
}
