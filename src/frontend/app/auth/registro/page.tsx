'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/shared/components/Header';
import { useAuth } from '@modules/users/context/AuthContext';
import RegistrationWizard from '@modules/users/components/RegistrationWizard';

const SideMenu = lazy(() =>
  import('@shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/explorar');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <>
        <Header title="Crear cuenta" onMenuClick={() => setMenuOpen(true)} />

        <Suspense fallback={null}>
          {menuOpen && (
            <SideMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </Suspense>

        <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-busy="true" aria-label="Verificando autenticación">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header title="Crear cuenta" onMenuClick={() => setMenuOpen(true)} />

      <Suspense fallback={null}>
        {menuOpen && (
          <SideMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </Suspense>

      <main className="flex justify-center px-mobile-margin md:px-desktop-margin pt-6">
        <div className="w-full max-w-[560px] py-6">
          <RegistrationWizard />
          <p className="text-center text-[16px] text-[#4b5563] mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="inline-flex items-center min-h-[44px] text-[#1d4ed8] font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
