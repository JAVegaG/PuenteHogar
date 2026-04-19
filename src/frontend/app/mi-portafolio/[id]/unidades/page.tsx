'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { PortfolioUnit, PortfolioSummary } from '@modules/landlord-portfolio/types';

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

function UnitCardSkeleton() {
  return (
    <div className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
      <Skeleton className="h-5 w-40 mb-2" />
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

function UnitsListingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando unidades...</span>
      {[1, 2, 3].map((i) => (
        <UnitCardSkeleton key={i} />
      ))}
    </div>
  );
}

function UnitCard({ unit, portfolioId }: { unit: PortfolioUnit; portfolioId: string }) {
  const status = unit.unitStatus ?? 'Disponible';
  const hasActiveListing = unit.hasActiveListing ?? false;
  const isOccupied = status === 'Ocupado';
  const isAvailable = status === 'Disponible';

  const propertyType = unit.propertyType ?? '';
  const address = unit.address ?? '';
  const rooms = unit.numberOfRooms ?? 0;
  const baths = unit.numberOfBathrooms ?? 0;
  const area = unit.area ?? null;

  // Build subtitle: "Apartamento • Piso 3" style
  const subtitle = propertyType || null;

  return (
    <article className="border border-[#d1d5db] rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
      {/* Header row: icon + name/type + status badge */}
      <div className="flex items-start gap-3">
        {/* Property icon */}
        <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#f3f4f6] shrink-0 mt-[2px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-body font-semibold text-[#111827]">
              {unit.name || 'Unidad sin nombre'}
            </h3>
            <StatusBadge status={status} variant="unit" />
          </div>
          {subtitle && (
            <p className="text-caption text-[#4b5563] mt-[2px]">{subtitle}</p>
          )}
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

      {/* Property details: area, rooms, baths */}
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
            <Link
              href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/arriendos`}
              aria-label={`Ver arriendos de ${unit.name || 'unidad'}`}
              className="flex items-center justify-center w-[44px] h-[44px] text-[#9ca3af]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Publish action for available units */}
      {isAvailable && !hasActiveListing && (
        <Link
          href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/publicar`}
          className="flex items-center justify-center gap-2 w-full bg-[#1d4ed8] text-white rounded-[6px] text-body font-medium min-h-[44px] mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Publicar en arriendo
        </Link>
      )}

      {/* Published indicator */}
      {hasActiveListing && (
        <div className="mt-3 flex items-center justify-center w-full min-h-[44px] rounded-[6px] bg-[#f0fdf4]">
          <p className="text-caption font-medium text-[#166534]">
            ✓ Publicada en Explorar
          </p>
        </div>
      )}

      {/* Lease history link (only for non-occupied units, occupied ones have the chevron) */}
      {!isOccupied && (
        <div className="mt-3">
          <Link
            href={`/mi-portafolio/${portfolioId}/unidades/${unit.id}/arriendos`}
            className="text-caption text-[#1d4ed8] hover:underline inline-flex items-center min-h-[44px]"
          >
            Ver historial
          </Link>
        </div>
      )}
    </article>
  );
}

function PortfolioUnitsContent() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [units, setUnits] = useState<PortfolioUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      // Fetch portfolio info to get name and stats
      const portfolioData = await portfolioService.getPortfolios(token, 1, 50);
      const match = portfolioData.data.find((p) => p.id === id);

      if (!match) {
        setNotFound(true);
        return;
      }

      setPortfolio(match);

      // Fetch units for this portfolio
      const unitsData = await portfolioService.getUnits(id, token);
      setUnits(unitsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (message === 'Sesión expirada') {
        logout();
        return;
      }
      if (message === 'Recurso no encontrado' || message === 'Unidad de portafolio no encontrada') {
        setNotFound(true);
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.accessToken, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const backArrow = (
    <Link
      href="/mi-portafolio"
      aria-label="Volver a mis portafolios"
      className="flex items-center justify-center w-[44px] h-[44px] rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </Link>
  );

  if (notFound) {
    return (
      <>
        <Header
          title="Unidades del portafolio"
          onMenuClick={() => { }}
          leftAction={backArrow}
        />
        <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
          <div className="text-center py-section-gap" aria-live="polite">
            <p className="text-[18px] font-medium text-neutral-900">
              Portafolio no encontrado
            </p>
            <Link
              href="/mi-portafolio"
              className="mt-4 inline-flex items-center text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px]"
            >
              Volver a mis portafolios
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        title="Unidades del portafolio"
        onMenuClick={() => { }}
        leftAction={backArrow}
      />

      <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
        <div className="w-full max-w-[560px]">
          {/* Portfolio summary */}
          {!isLoading && portfolio && (
            <section aria-label="Resumen del portafolio" className="mb-6">
              <h2 className="text-[20px] font-semibold text-[#111827]">
                {portfolio.name}
              </h2>
              <div className="flex gap-4 mt-3">
                <div className="flex-1 border border-neutral-300 rounded-[6px] bg-white p-3 text-center">
                  <p className="text-[24px] font-bold text-neutral-900">
                    {portfolio.totalUnits}
                  </p>
                  <p className="text-caption text-neutral-600">Unidades</p>
                </div>
                <div className="flex-1 border border-neutral-300 rounded-[6px] bg-white p-3 text-center">
                  <p className="text-[24px] font-bold text-neutral-900">
                    {portfolio.activeLeases}
                  </p>
                  <p className="text-caption text-neutral-600">Arriendos activos</p>
                </div>
              </div>
            </section>
          )}

          {/* Add unit button */}
          {!isLoading && !error && (
            <Link
              href={`/mi-portafolio/${id}/agregar-unidad`}
              className="block w-full bg-primary text-white text-center rounded-card h-[56px] leading-[56px] text-body font-medium min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 mb-section-gap"
            >
              + Agregar unidad
            </Link>
          )}

          {/* Units list */}
          <section aria-live="polite" aria-busy={isLoading}>
            {isLoading ? (
              <UnitsListingSkeleton />
            ) : error ? (
              <ErrorState onRetry={fetchData} />
            ) : units.length === 0 ? (
              <div className="text-center py-section-gap">
                <p className="text-[18px] font-medium text-neutral-900">
                  Este portafolio no tiene unidades
                </p>
                <p className="text-body text-neutral-600 mt-2">
                  Agrega tu primera unidad para comenzar a gestionar tus propiedades.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {units.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} portfolioId={id} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default function PortfolioUnitsPage() {
  return (
    <LandlordRoute>
      <PortfolioUnitsContent />
    </LandlordRoute>
  );
}
