import Link from 'next/link';
import type { PortfolioSummary } from '../types';

interface PortfolioCardProps {
  portfolio: PortfolioSummary;
}

export default function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const hasDescription =
    portfolio.description !== null && portfolio.description.trim() !== '';

  return (
    <article className="border border-[#d1d5db] rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span aria-hidden="true">🏢</span>
        <h3 className="text-[20px] font-semibold text-[#111827]">
          {portfolio.name}
        </h3>
      </div>

      {hasDescription && (
        <p className="text-[14px] text-[#4b5563] mt-1">
          {portfolio.description}
        </p>
      )}

      <div className="flex flex-col gap-1 mt-3 text-[14px] text-[#4b5563]">
        <p>Unidades totales: {portfolio.totalUnits}</p>
        <p>Arriendos activos: {portfolio.activeLeases}</p>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[14px] text-[#4b5563] mb-1">
          <span>Ocupación</span>
          <span>{portfolio.occupancyPercentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={portfolio.occupancyPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Ocupación del portafolio ${portfolio.name}: ${portfolio.occupancyPercentage}%`}
          className="w-full h-2 bg-[#e5e7eb] rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-[#1d4ed8] rounded-full transition-all"
            style={{ width: `${portfolio.occupancyPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/mi-portafolio/${portfolio.id}/unidades`}
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 text-[14px] font-medium text-[#1d4ed8] border border-[#1d4ed8] rounded-[6px] hover:bg-[#eff6ff] transition-colors"
        >
          Ver unidades
        </Link>
      </div>
    </article>
  );
}
