import Link from 'next/link';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { PortfolioUnit } from '../types';

interface UnitCardProps {
  unit: PortfolioUnit;
  portfolioId?: string;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('es-CO')}`;
  }
}

export default function UnitCard({ unit, portfolioId }: UnitCardProps) {
  const status = unit.unitStatus ?? 'Disponible';
  const hasActiveListing = unit.hasActiveListing ?? false;
  const isOccupied = status === 'Ocupado';
  const isAvailable = status === 'Disponible';
  const pid = portfolioId ?? unit.portfolioId;

  const propertyType = unit.propertyType ?? '';
  const address = unit.address ?? '';
  const rooms = unit.numberOfRooms ?? 0;
  const baths = unit.numberOfBathrooms ?? 0;
  const area = unit.area ?? null;

  return (
    <article className="border border-[#d1d5db] rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
      {/* Header row: icon + name/type + status badge */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#f3f4f6] shrink-0 mt-[2px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1 shrink-0">
              <h3 className="text-body font-semibold text-[#111827]">
                {unit.name || 'Unidad sin nombre'}
              </h3>
              {propertyType && (
                <p className="text-caption text-[#4b5563] mt-[2px]">{propertyType}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge status={status} variant="unit" />
              <StatusBadge status={hasActiveListing ? 'Publicada' : 'Sin publicar'} variant="listing" />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      {address && (
        <div className="flex items-center gap-[6px] mt-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-caption text-[#4b5563]">{address}</p>
        </div>
      )}

      {/* Property details */}
      {(area !== null || rooms > 0 || baths > 0) && (
        <div className="flex items-center gap-[12px] mt-[8px] text-caption text-[#4b5563]">
          {area !== null && <span>{area} m²</span>}
          {area !== null && rooms > 0 && <span aria-hidden="true">·</span>}
          {rooms > 0 && <span>{rooms} hab</span>}
          {(area !== null || rooms > 0) && baths > 0 && <span aria-hidden="true">·</span>}
          {baths > 0 && <span>{baths} baños</span>}
        </div>
      )}

      {/* Tenant section for occupied units */}
      {isOccupied && unit.tenantName && (
        <div className="mt-3 pt-3 border-t border-[#e5e7eb]">
          <p className="text-small text-[#4b5563]">Arrendatario actual</p>
          <div className="flex items-center justify-between mt-[4px]">
            <div>
              <p className="text-caption font-medium text-[#111827]">{unit.tenantName}</p>
              {unit.monthlyRent != null && (
                <p className="text-body font-semibold text-[#111827] mt-[2px]">
                  {formatCurrency(unit.monthlyRent, 'COP')}/mes
                </p>
              )}
            </div>
            {pid && (
              <Link
                href={`/mi-portafolio/${pid}/unidades/${unit.id}/arriendos`}
                aria-label={`Ver arriendos de ${unit.name || 'unidad'}`}
                className="flex items-center justify-center w-[44px] h-[44px] text-[#9ca3af]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Publish action */}
      {isAvailable && !hasActiveListing && pid && (
        <Link
          href={`/mi-portafolio/${pid}/unidades/${unit.id}/publicar`}
          className="flex items-center justify-center gap-2 w-full bg-[#1d4ed8] text-white rounded-[6px] text-body font-medium min-h-[44px] mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2"
        >
          Publicar en arriendo
        </Link>
      )}

      {/* Manage listing action */}
      {hasActiveListing && pid && (
        <Link
          href={`/mi-portafolio/${pid}/unidades/${unit.id}/publicacion`}
          className="flex items-center justify-center gap-2 w-full border border-[#1d4ed8] text-[#1d4ed8] rounded-[6px] text-body font-medium min-h-[44px] mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2"
        >
          Gestionar publicación
        </Link>
      )}

      {/* Lease history link (non-occupied) */}
      {!isOccupied && pid && (
        <div className="mt-3">
          <Link
            href={`/mi-portafolio/${pid}/unidades/${unit.id}/arriendos`}
            className="text-caption text-[#1d4ed8] hover:underline inline-flex items-center min-h-[44px]"
          >
            Ver historial
          </Link>
        </div>
      )}
    </article>
  );
}
