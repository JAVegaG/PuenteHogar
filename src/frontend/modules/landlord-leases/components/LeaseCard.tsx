import Link from 'next/link';

import { StatusBadge } from '@/shared/components/StatusBadge';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { LeaseListItem } from '../types';

interface LeaseCardProps {
    lease: LeaseListItem;
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

export function LeaseCard({ lease, portfolioId, unitId }: LeaseCardProps) {
    const basePath = `/mi-portafolio/${portfolioId}/unidades/${unitId}/arriendos/${lease.id}`;
    const periodEnd = lease.endDate ? formatDateDMY(lease.endDate) : 'Vigente';
    const periodText = `${formatDateDMY(lease.startDate)} - ${periodEnd}`;

    const showGenerateContract = !lease.contractId;
    const showViewContract =
        lease.contractStatus === 'PENDING' || lease.contractStatus === 'SIGNATURE_PENDING';
    const showArchivedContract = lease.contractStatus === 'SIGNED';

    return (
        <article
            className="rounded-[6px] bg-white p-[16px]"
            style={{ border: '1px solid #d1d5db' }}
        >
            <div className="flex items-start justify-between gap-[8px]">
                <p className="text-body font-semibold" style={{ color: '#111827' }}>
                    {lease.tenantName}
                </p>
                <StatusBadge status={lease.status} variant={
                    ['Vigente', 'Acordado', 'Finalizado'].includes(lease.status) ? 'lease' : 'tracking'
                } />
            </div>

            <p className="text-caption mt-[4px]" style={{ color: '#4b5563' }}>
                {periodText}
            </p>

            <p className="text-h3 font-semibold mt-[8px]" style={{ color: '#1d4ed8' }}>
                {formatPrice(lease.monthlyAmount)}
            </p>

            <div className="flex flex-wrap gap-[8px] mt-[16px]">
                <Link
                    href={basePath}
                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-[16px] py-[8px] text-caption font-medium rounded-[6px] transition-colors"
                    style={{ color: '#1d4ed8', border: '1px solid #1d4ed8' }}
                >
                    Ver detalle
                </Link>

                {showGenerateContract && (
                    <Link
                        href={`${basePath}/crear-contrato`}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-[16px] py-[8px] text-caption font-medium rounded-[6px] transition-colors"
                        style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                    >
                        Generar contrato
                    </Link>
                )}

                {showViewContract && (
                    <Link
                        href={basePath}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-[16px] py-[8px] text-caption font-medium rounded-[6px] transition-colors"
                        style={{ color: '#1d4ed8', border: '1px solid #1d4ed8' }}
                    >
                        Ver contrato
                    </Link>
                )}

                {showArchivedContract && (
                    <Link
                        href={basePath}
                        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-[16px] py-[8px] text-caption font-medium rounded-[6px] transition-colors"
                        style={{ color: '#4b5563', border: '1px solid #d1d5db' }}
                    >
                        Ver contrato archivado
                    </Link>
                )}
            </div>
        </article>
    );
}
