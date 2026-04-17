'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/shared/components/Header';
import { useAuth } from '@modules/users/context/AuthContext';
import LoginForm from '@modules/users/components/LoginForm';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/explorar');
    }
  }, [isAuthenticated, isLoading, router]);

  const backButton = (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Volver"
      className="flex items-center justify-center w-[40px] h-[40px] rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (isLoading) {
    return (
      <>
        <Header title="Iniciar sesión" onMenuClick={() => {}} leftAction={backButton} />
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
      <Header title="Iniciar sesión" onMenuClick={() => {}} leftAction={backButton} />
      <main className="flex justify-center px-4 pt-[73px]">
        <div className="w-full max-w-[448px] px-4 py-6">
          <LoginForm />
        </div>
      </main>
    </>
  );
}
