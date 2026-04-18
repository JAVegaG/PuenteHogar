'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewUnitRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mi-portafolio');
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-body text-neutral-600">Redirigiendo...</p>
    </main>
  );
}
