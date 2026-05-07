import Link from 'next/link';

import { StatusBadge } from '@/shared/components/StatusBadge';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { LeaseDetail } from '../types';

interface LeaseDetailViewProps {
    lease: LeaseDetail;
    portfolioId: string;
    unitId: string;
}

function formatDateDMY(isoDate: string): string {
    const date = new Date(isoDate);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-[2px]">
            <span className="text-caption font-medium" style={{ color: '#4b5563' }}>
                {label}
            </span>
            <span className="text-body" style={{ color: '#111827' }}>
                {value}
            </span>
        </div>
    );
}

export function LeaseDetailView({ lease, portfolioId, unitId }: LeaseDetailViewProps) {
    const hasContract = !!lease.contractId;
    const basePath = `/mi-portafolio/${portfolioId}/unidades/${unitId}/arriendos/${lease.id}`;

    return (
        <div className="flex flex-col gap-[24px]">
            {/* Inmueble Card */}
            <section
                className="border border-neutral-200 rounded-card bg-white p-4"
                aria-labelledby="section-inmueble"
            >
                <h2
                    id="section-inmueble"
                    className="text-h3 font-semibold mb-[12px]"
                    style={{ color: '#111827' }}
                >
                    Inmueble
                </h2>
                <div className="flex flex-col gap-[12px]">
                    <DetailField label="Tipo de propiedad" value={lease.property.propertyType} />
                    <DetailField label="Habitaciones" value={String(lease.property.numberOfRooms)} />
                    <DetailField label="Baños" value={String(lease.property.numberOfBathrooms)} />
                    <DetailField
                        label="Área"
                        value={lease.property.area != null ? `${lease.property.area} m²` : 'No especificada'}
                    />
                    <DetailField label="Dirección" value={lease.property.address} />
                </div>
            </section>

            {/* Arrendatario Card */}
            <section
                className="border border-neutral-200 rounded-card bg-white p-4"
                aria-labelledby="section-arrendatario"
            >
                <h2
                    id="section-arrendatario"
                    className="text-h3 font-semibold mb-[12px]"
                    style={{ color: '#111827' }}
                >
                    Arrendatario
                </h2>
                <div className="flex flex-col gap-[12px]">
                    <DetailField label="Nombre completo" value={lease.tenant.fullName} />
                    <DetailField
                        label="Documento"
                        value={`${lease.tenant.documentTypeCode} ${lease.tenant.documentNumber}`}
                    />
                    <DetailField label="Correo electrónico" value={lease.tenant.email} />
                    <DetailField label="Teléfono" value={lease.tenant.phoneNumber} />
                </div>
            </section>

            {/* Acuerdo Card */}
            <section
                className="border border-neutral-200 rounded-card bg-white p-4"
                aria-labelledby="section-acuerdo"
            >
                <h2
                    id="section-acuerdo"
                    className="text-h3 font-semibold mb-[12px]"
                    style={{ color: '#111827' }}
                >
                    Acuerdo
                </h2>
                <div className="flex flex-col gap-[12px]">
                    <div className="flex flex-col gap-[2px]">
                        <span className="text-caption font-medium" style={{ color: '#4b5563' }}>
                            Canon mensual
                        </span>
                        <span className="text-h3 font-semibold" style={{ color: '#1d4ed8' }}>
                            {formatPrice(lease.monthlyAmount)}
                        </span>
                    </div>
                    <DetailField label="Fecha de inicio" value={formatDateDMY(lease.startDate)} />
                    {lease.endDate && (
                        <DetailField label="Fecha de fin" value={formatDateDMY(lease.endDate)} />
                    )}
                    {hasContract && (
                        <>
                            <div className="flex flex-col gap-[2px]">
                                <span className="text-caption font-medium" style={{ color: '#4b5563' }}>
                                    Contrato
                                </span>
                                <Link
                                    href={
                                        lease.contractStatus === 'SIGNED'
                                            ? `/mis-contratos/${lease.contractId}`
                                            : basePath
                                    }
                                    className="text-body font-medium"
                                    style={{ color: '#1d4ed8' }}
                                >
                                    {lease.contractStatus === 'SIGNED'
                                        ? 'Ver contrato archivado'
                                        : 'Ver contrato'}
                                </Link>
                            </div>
                            {lease.contractStatus && (
                                <div className="flex flex-col gap-[2px]">
                                    <span className="text-caption font-medium" style={{ color: '#4b5563' }}>
                                        Estado del contrato
                                    </span>
                                    <div>
                                        <StatusBadge status={lease.contractStatus} variant="contract" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Bottom action button */}
            {!hasContract && (
                <Link
                    href={`${basePath}/crear-contrato`}
                    className="inline-flex items-center justify-center w-full min-h-[44px] px-[16px] py-[12px] text-body font-semibold rounded-[6px] transition-colors text-center"
                    style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                >
                    Generar contrato
                </Link>
            )}
        </div>
    );
}
