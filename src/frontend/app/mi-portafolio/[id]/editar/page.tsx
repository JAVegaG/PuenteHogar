'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { UnitForm } from '@modules/landlord-portfolio/components/UnitForm';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import type { PortfolioUnit } from '@modules/landlord-portfolio/types';

function EditUnitContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [unit, setUnit] = useState<PortfolioUnit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchUnit = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;

    setIsLoading(true);
    setNotFound(false);

    try {
      const units = await portfolioService.getUnits(token);
      const found = units.find((u) => u.id === id);
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
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.accessToken, logout]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  const backArrow = (
    <Link
      href={`/mi-portafolio/${id}`}
      aria-label="Volver al detalle de unidad"
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
        title="Editar unidad"
        onMenuClick={() => {}}
        leftAction={backArrow}
      />

      <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
        {isLoading && (
          <div aria-busy="true" aria-live="polite">
            <section aria-label="Cargando formulario de edición">
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-[48px] w-full rounded-[10px]" />

              <Skeleton className="h-5 w-48 mt-4 mb-1" />
              <Skeleton className="h-[48px] w-full rounded-[10px]" />

              <Skeleton className="h-5 w-20 mt-4 mb-1" />
              <Skeleton className="h-[48px] w-full rounded-[10px]" />

              <Skeleton className="h-5 w-52 mt-4 mb-1" />
              <Skeleton className="h-[72px] w-full rounded-[10px]" />

              <Skeleton className="h-[48px] w-full mt-4 rounded-[10px]" />
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

        {!isLoading && !notFound && unit && (
          <UnitForm
            mode="edit"
            initialData={unit}
            onSuccess={() => router.push(`/mi-portafolio/${id}`)}
          />
        )}
      </main>
    </>
  );
}

export default function EditUnitPage() {
  return (
    <LandlordRoute>
      <EditUnitContent />
    </LandlordRoute>
  );
}
