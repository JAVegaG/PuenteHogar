'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { UnitForm } from '@modules/landlord-portfolio/components/UnitForm';
import { Header } from '@/shared/components/Header';

function NewUnitContent() {
  const router = useRouter();

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
        title="Agregar unidad"
        onMenuClick={() => {}}
        leftAction={backArrow}
      />

      <main className="px-mobile-margin md:px-desktop-margin py-section-gap">
        <UnitForm mode="create" onSuccess={() => router.push('/mi-portafolio')} />
      </main>
    </>
  );
}

export default function NewUnitPage() {
  return (
    <LandlordRoute>
      <NewUnitContent />
    </LandlordRoute>
  );
}
