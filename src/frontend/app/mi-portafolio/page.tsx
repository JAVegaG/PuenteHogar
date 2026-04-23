'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import PortfolioCard from '@modules/landlord-portfolio/components/PortfolioCard';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { Pagination } from '@/shared/components/Pagination';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import type { PaginatedPortfolios, PortfolioSummary } from '@modules/landlord-portfolio/types';

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

function PortfolioCardSkeleton() {
  return (
    <div className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-32 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-2 w-full mb-3" />
      <Skeleton className="h-10 w-28" />
    </div>
  );
}

function PortfolioListingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando portafolios...</span>
      {[1, 2, 3].map((i) => (
        <PortfolioCardSkeleton key={i} />
      ))}
    </div>
  );
}

function PortfolioContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PaginatedPortfolios | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { user, logout } = useAuth();

  const sideMenuUser = user
    ? { name: user.displayName, role: translateRole(user.roles[0]) }
    : null;

  const fetchPortfolios = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await portfolioService.getPortfolios(token, page, pageSize);
      setPortfolioData(data);
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
  }, [user?.accessToken, logout, page, pageSize]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (createName.trim() === '') {
      setCreateError('El nombre del portafolio es obligatorio');
      return;
    }

    const token = user?.accessToken;
    if (!token) {
      logout();
      return;
    }

    setIsCreating(true);
    try {
      await portfolioService.createPortfolio(
        {
          name: createName.trim(),
          description: createDescription.trim() || undefined,
        },
        token,
      );
      setCreateName('');
      setCreateDescription('');
      setShowCreateForm(false);
      fetchPortfolios();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      if (message === 'Sesión expirada') {
        logout();
        return;
      }
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Header title="Mis arriendos" onMenuClick={() => setMenuOpen(true)} />

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

      <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
        <div className="w-full max-w-[560px]">
          <section aria-label="Información del portafolio">
            <h2 className="text-body text-neutral-600 mb-4">Gestión de propiedades</h2>

            {/* Global counters */}
            {!isLoading && !error && portfolioData && (
              <div className="flex gap-4 mb-4">
                <div className="flex-1 border border-neutral-300 rounded-[6px] bg-white p-3 text-center">
                  <p className="text-[24px] font-bold text-neutral-900">
                    {portfolioData.globalTotalUnits}
                  </p>
                  <p className="text-caption text-neutral-600">Unidades totales</p>
                </div>
                <div className="flex-1 border border-neutral-300 rounded-[6px] bg-white p-3 text-center">
                  <p className="text-[24px] font-bold text-neutral-900">
                    {portfolioData.globalActiveLeases}
                  </p>
                  <p className="text-caption text-neutral-600">Arriendos activos</p>
                </div>
              </div>
            )}

            {/* Create portfolio button */}
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="block w-full bg-primary text-white text-center rounded-card h-[56px] text-body font-medium min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 mb-section-gap"
            >
              + Crear nuevo portafolio
            </button>

            {/* Inline create portfolio form */}
            {showCreateForm && (
              <form
                onSubmit={handleCreatePortfolio}
                className="border border-neutral-300 rounded-[6px] bg-white p-4 mb-section-gap flex flex-col gap-3"
              >
                {createError && (
                  <div
                    role="alert"
                    className="rounded-md bg-red-50 border border-red-200 p-3 text-caption text-red-700"
                  >
                    {createError}
                  </div>
                )}
                <div>
                  <label
                    htmlFor="portfolio-name"
                    className="block text-caption font-medium text-gray-700 mb-1"
                  >
                    Nombre del portafolio
                  </label>
                  <input
                    id="portfolio-name"
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ej: Propiedades Centro"
                    className="w-full h-[48px] min-h-[44px] rounded-[10px] border border-gray-300 px-3 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="portfolio-description"
                    className="block text-caption font-medium text-gray-700 mb-1"
                  >
                    Descripción (opcional)
                  </label>
                  <textarea
                    id="portfolio-description"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Descripción breve del portafolio"
                    rows={2}
                    className="w-full min-h-[44px] rounded-[10px] border border-gray-300 px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isCreating}
                    aria-busy={isCreating}
                  >
                    {isCreating ? 'Creando...' : 'Crear portafolio'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateError(null);
                    }}
                    disabled={isCreating}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </section>

          <section aria-live="polite" aria-busy={isLoading}>
            {isLoading ? (
              <PortfolioListingSkeleton />
            ) : error ? (
              <ErrorState onRetry={fetchPortfolios} />
            ) : portfolioData && portfolioData.data.length === 0 ? (
              <div className="text-center py-section-gap">
                <p className="text-[18px] font-medium text-neutral-900">
                  No tienes portafolios
                </p>
                <p className="text-body text-neutral-600 mt-2">
                  Crea tu primer portafolio para comenzar a gestionar tus propiedades.
                </p>
              </div>
            ) : portfolioData ? (
              <>
                <div className="flex flex-col gap-4">
                  {portfolioData.data.map((portfolio) => (
                    <PortfolioCard
                      key={portfolio.id}
                      portfolio={portfolio}
                      token={user?.accessToken ?? ''}
                      onUpdate={(updated: PortfolioSummary) => {
                        setPortfolioData((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            data: prev.data.map((p) =>
                              p.id === updated.id ? updated : p,
                            ),
                          };
                        });
                      }}
                      onDelete={(id: string) => {
                        setPortfolioData((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            data: prev.data.filter((p) => p.id !== id),
                            total: prev.total - 1,
                          };
                        });
                      }}
                    />
                  ))}
                </div>

                <Pagination
                  total={portfolioData.total}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : null}
          </section>
        </div>
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
