import Link from 'next/link';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { PortfolioUnit } from '../types';

interface UnitDetailViewProps {
  unit: PortfolioUnit;
}

function formatSpanishDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function UnitDetailView({ unit }: UnitDetailViewProps) {
  const hasConditions = unit.conditions !== null && unit.conditions.trim() !== '';
  const formattedPrice = formatPrice(unit.leaseBaseAmount);
  const hasActiveListing = unit.hasActiveListing ?? false;
  const unitStatus = unit.unitStatus ?? 'Disponible';
  const portfolioId = unit.portfolioId;

  return (
    <div>
      <section aria-label="Canon base de arrendamiento">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-[24px] font-bold text-[#1d4ed8]">
            ${formattedPrice}/mes
          </h2>
          <span className="bg-[#f3f4f6] rounded-[4px] px-2 py-0.5 text-[14px] text-[#4b5563]">
            {unit.leaseBaseCurrency}
          </span>
        </div>
      </section>

      <section aria-label="Condiciones del arrendamiento" className="mt-6">
        <h3 className="text-[20px] font-semibold">Condiciones</h3>
        {hasConditions ? (
          <p className="text-[16px] text-[#4b5563] mt-2">{unit.conditions}</p>
        ) : (
          <p className="text-[16px] text-[#4b5563] mt-2">Sin condiciones especiales</p>
        )}
      </section>

      <section aria-label="Información de la unidad" className="mt-6">
        <h3 className="text-[20px] font-semibold">Información</h3>
        <dl className="mt-2 space-y-1 text-[16px] text-[#4b5563]">
          <div className="flex gap-1">
            <dt>Fecha de creación:</dt>
            <dd>{formatSpanishDate(unit.createdAt)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Última actualización:</dt>
            <dd>{formatSpanishDate(unit.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/mi-portafolio/${unit.id}/editar`}
          className="block w-full h-[48px] rounded-[10px] min-w-[44px] min-h-[44px] text-body bg-primary text-white text-center leading-[48px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
        >
          Editar unidad
        </Link>

        {hasActiveListing && (
          <Link
            href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicacion`}
            className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-[#1d4ed8] text-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2 transition-colors"
          >
            Gestionar publicación
          </Link>
        )}

        {unitStatus === 'Disponible' && !hasActiveListing && (
          <Link
            href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicar`}
            className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] text-body font-medium border border-[#1d4ed8] text-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2 transition-colors"
          >
            Publicar en arriendo
          </Link>
        )}
      </div>
    </div>
  );
}
