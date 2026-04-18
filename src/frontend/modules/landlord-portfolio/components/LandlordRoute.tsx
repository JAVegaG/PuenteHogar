'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@modules/users/context/AuthContext';

interface LandlordRouteProps {
  children: React.ReactNode;
}

export default function LandlordRoute({ children }: LandlordRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" aria-busy="true" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary" role="status">
          <span className="sr-only">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!user?.roles.includes('LANDLORD')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center" aria-live="polite">
        <p className="text-lg text-gray-700 mb-4">
          No tienes permisos para acceder a esta sección
        </p>
        <Link
          href="/explorar"
          className="text-primary underline hover:text-primary/80 min-h-[44px] min-w-[44px] inline-flex items-center"
        >
          Ir a explorar
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
