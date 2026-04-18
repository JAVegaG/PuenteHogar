'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { AddUnitForm } from '@modules/landlord-portfolio/components/AddUnitForm';
import { useAuth } from '@modules/users/context/AuthContext';
import { portfolioService } from '@/shared/services/portfolio';
import { Header } from '@/shared/components/Header';

function AddUnitContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [portfolioName, setPortfolioName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchPortfolioName = useCallback(async () => {
    const token = user?.accessToken;
    if (!token) return;

    try {
      const data = await portfolioService.getPortfolios(token, 1, 50);
      const match = data.data.find((p) => p.id === id);
      if (match) {
        setPortfolioName(match.name);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Sesión expirada') {
        logout();
        return;
      }
      // On error fetching name, just use the id as fallback
      setPortfolioName(null);
    }
  }, [id, user?.accessToken, logout]);

  useEffect(() => {
    fetchPortfolioName();
  }, [fetchPortfolioName]);

  const handleSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      router.push(`/mi-portafolio`);
    }, 2000);
  };

  const handleCancel = () => {
    router.push('/mi-portafolio');
  };

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

  if (notFound) {
    return (
      <>
        <Header
          title="Agregar unidad"
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

  if (showSuccess) {
    return (
      <>
        <Header
          title="Agregar unidad"
          onMenuClick={() => { }}
          leftAction={backArrow}
        />
        <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
          <div
            role="alert"
            className="rounded-md bg-green-50 border border-green-200 p-4 text-center"
          >
            <p className="text-green-800 font-medium">
              ¡Unidad agregada exitosamente!
            </p>
            <p className="text-green-700 text-caption mt-1">
              Redirigiendo al portafolio...
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        title="Agregar unidad"
        onMenuClick={() => { }}
        leftAction={backArrow}
      />

      <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
        <div className="w-full max-w-[560px]">
          <section aria-label="Información del portafolio">
            <p className="text-body text-neutral-600 mb-4">
              Agregando unidad a: {portfolioName ?? id}
            </p>

            {/* Informational banner */}
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-6">
              <p className="text-caption text-blue-800">
                Una unidad es una propiedad individual dentro de tu portafolio que
                puede ser arrendada. Por ejemplo: Apartamento 301, Casa 5, Local
                102, etc.
              </p>
            </div>
          </section>

          <section aria-label="Formulario de agregar unidad">
            <AddUnitForm
              portfolioId={id}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </section>

          {/* Próximos pasos */}
          <section
            aria-label="Próximos pasos"
            className="mt-8 rounded-md bg-neutral-50 border border-neutral-200 p-4"
          >
            <h3 className="text-caption font-semibold text-neutral-900 mb-2">
              Próximos pasos
            </h3>
            <p className="text-caption text-neutral-600">
              Una vez agregada la unidad, podrás publicarla en clasificados, crear arriendos para ella,
              gestionar contratos y realizar seguimiento de pagos.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

export default function AddUnitPage() {
  return (
    <LandlordRoute>
      <AddUnitContent />
    </LandlordRoute>
  );
}
