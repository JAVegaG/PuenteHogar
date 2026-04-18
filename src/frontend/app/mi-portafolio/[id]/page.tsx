'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import UnitDetailView from '@modules/landlord-portfolio/components/UnitDetailView';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';

function UnitDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const [unit, setUnit] = useState<PortfolioUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchUnit = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      // Fetch all portfolios, then search units across them
      const portfolios = await portfolioService.getPortfolios(token, 1, 50);
      let found: PortfolioUnit | undefined;
      for (const p of portfolios.data) {
        const units = await portfolioService.getUnits(p.id, token);
        found = units.find((u) => u.id === id);
        if (found) break;
      }
      if (!found) {
        setNotFound(true);
      } else {
        setUnit(found);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (message === 'Sesión expirada') {
        logout();
        return;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.accessToken, logout]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  const backArrow = (
    <Link
      href="/mi-portafolio"
      aria-label="Volver a mi portafolio"
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

  return (
    <>
      <Header
        title="Detalle de unidad"
        onMenuClick={() => {}}
        leftAction={backArrow}
      />

      <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
        {isLoading && (
          <div aria-busy="true" aria-live="polite">
            <section aria-label="Cargando detalle de unidad">
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-12" />
              </div>

              <div className="mt-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-full mt-2" />
              </div>

              <div className="mt-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-56 mt-2" />
                <Skeleton className="h-5 w-56 mt-1" />
              </div>

              <Skeleton className="h-[48px] w-full mt-6 rounded-[10px]" />
            </section>
          </div>
        )}

        {!isLoading && notFound && (
          <div className="text-center py-section-gap" aria-live="polite">
            <p className="text-[18px] font-medium text-neutral-900">
              Unidad de portafolio no encontrada
            </p>
            <Link
              href="/mi-portafolio"
              className="mt-4 inline-flex items-center text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px]"
            >
              Volver a mi portafolio
            </Link>
          </div>
        )}

        {!isLoading && error && !notFound && (
          <ErrorState onRetry={fetchUnit} />
        )}

        {!isLoading && !error && !notFound && unit && (
          <UnitDetailView unit={unit} />
        )}
      </main>
    </>
  );
}

export default function UnitDetailPage() {
  return (
    <LandlordRoute>
      <UnitDetailContent />
    </LandlordRoute>
  );
}
