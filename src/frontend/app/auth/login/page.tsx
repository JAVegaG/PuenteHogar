'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/shared/components/Header';
import { useAuth } from '@modules/users/context/AuthContext';
import LoginForm from '@modules/users/components/LoginForm';

const SideMenu = lazy(() =>
  import('@shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/mi-perfil');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <>
        <Header title="Iniciar sesión" onMenuClick={() => setMenuOpen(true)} />

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
      <Header title="Iniciar sesión" onMenuClick={() => setMenuOpen(true)} />

      <Suspense fallback={null}>
        {menuOpen && (
          <SideMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </Suspense>

      <main className="flex justify-center px-mobile-margin md:px-desktop-margin pt-[73px]">
        <div className="w-full max-w-[560px] py-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
