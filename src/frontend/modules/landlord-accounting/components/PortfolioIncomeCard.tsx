import Link from 'next/link';

import { formatPrice } from '@/shared/utils/formatPrice';
import type { PortfolioIncomeSummary } from '../types';

interface PortfolioIncomeCardProps {
    portfolio: PortfolioIncomeSummary;
}

export function PortfolioIncomeCard({ portfolio }: PortfolioIncomeCardProps) {
    return (
        <article
            className="rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-[16px]"
            style={{ border: '1px solid #d1d5db' }}
        >
            <p className="text-body font-semibold" style={{ color: '#111827' }}>
                {portfolio.name}
            </p>
            <p className="text-caption mt-[4px]" style={{ color: '#4b5563' }}>
                {portfolio.totalUnits} {portfolio.totalUnits === 1 ? 'inmueble' : 'inmuebles'}
            </p>
            <p className="text-h3 font-semibold mt-[8px]" style={{ color: '#1d4ed8' }}>
                ${formatPrice(portfolio.monthlyIncome)}
            </p>

            <div className="flex gap-[8px] mt-[16px]">
                <Link
                    href={`/mis-ingresos/portafolio/${portfolio.id}`}
                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-[16px] py-[8px] text-caption font-medium rounded-[6px] transition-colors"
                    style={{
                        backgroundColor: '#1d4ed8',
                        color: '#ffffff',
                    }}
                >
                    Ver reporte
                </Link>
                <Link
                    href={`/mi-portafolio/${portfolio.id}/unidades`}
                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-[16px] py-[8px] text-caption font-medium rounded-[6px] transition-colors"
                    style={{
                        color: '#1d4ed8',
                        border: '1px solid #1d4ed8',
                    }}
                >
                    Ver inmuebles
                </Link>
            </div>
        </article>
    );
}
