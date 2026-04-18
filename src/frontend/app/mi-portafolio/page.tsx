'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import PortfolioList from '@modules/landlord-portfolio/components/PortfolioList';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';

const SideMenu = lazy(() =>
  import('@/shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

function translateRole(role: string): string {
  const map: Record<string, string> = {
    LANDLORD: 'Arrendador',
    TENANT: 'Arrendatario',
  };
  return map[role] || role;
}

function PortfolioSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando unidades del portafolio...</span>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4"
        >
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-5 w-16 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function PortfolioContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [units, setUnits] = useState<PortfolioUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();

  const sideMenuUser = user
    ? { name: user.displayName, role: translateRole(user.roles[0]) }
    : null;

  const fetchUnits = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await portfolioService.getUnits(token);
      setUnits(data);
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
  }, [user?.accessToken, logout]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  return (
    <>
      <Header title="Mi portafolio" onMenuClick={() => setMenuOpen(true)} />

      <Suspense fallback={null}>
        {menuOpen && (
          <SideMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            user={sideMenuUser}
            onLogout={user ? logout : undefined}
          />
        )}
      </Suspense>

      <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
        <Link
          href="/mi-portafolio/nueva-unidad"
          className="block w-full bg-primary text-white text-center rounded-card h-[56px] leading-[56px] text-body font-medium min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 mb-section-gap"
        >
          Agregar unidad
        </Link>

        <section aria-live="polite" aria-busy={isLoading}>
          {isLoading ? (
            <PortfolioSkeleton />
          ) : error ? (
            <ErrorState onRetry={fetchUnits} />
          ) : units.length === 0 ? (
            <div className="text-center py-section-gap">
              <p className="text-[18px] font-medium text-neutral-900">
                No tienes unidades en tu portafolio
              </p>
              <p className="text-body text-neutral-600 mt-2">
                Agrega tu primera unidad para comenzar a gestionar tus inmuebles.
              </p>
            </div>
          ) : (
            <PortfolioList units={units} />
          )}
        </section>
      </main>
    </>
  );
}

export default function PortfolioPage() {
  return (
    <LandlordRoute>
      <PortfolioContent />
    </LandlordRoute>
  );
}
