'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Header } from '@/shared/components/Header';
import { ErrorState } from '@/shared/components/ErrorState';
import { ListingDetailSkeleton } from '@/shared/components/ListingDetailSkeleton';
import { fetchListingDetail } from '@/shared/services/api';
import PhotoGallery from '@modules/property-listings/components/PhotoGallery';
import ListingDetailView from '@modules/property-listings/components/ListingDetailView';
import { ContactLandlordButton } from '@/modules/tenant/components/ContactLandlordButton';
import type { ListingDetail } from '@modules/property-listings/types';

type PageState =
  | { status: 'loading' }
  | { status: 'success'; data: ListingDetail }
  | { status: 'not_found' }
  | { status: 'error' };

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [state, setState] = useState<PageState>({ status: 'loading' });

  const loadDetail = useCallback(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    fetchListingDetail(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', data });
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.message === 'NOT_FOUND') {
          setState({ status: 'not_found' });
        } else {
          setState({ status: 'error' });
        }
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const cleanup = loadDetail();
    return cleanup;
  }, [loadDetail]);

  const backButton = (
    <Link
      href="/explorar"
      aria-label="Volver a explorar"
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
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </Link>
  );

  return (
    <>
      <Header
        title="Detalle del inmueble"
        onMenuClick={() => { }}
        leftAction={backButton}
      />

      <section
        className="py-section-gap"
        aria-live="polite"
        aria-busy={state.status === 'loading'}
      >
        {state.status === 'loading' && (
          <div className="px-mobile-margin md:px-desktop-margin">
            <ListingDetailSkeleton />
          </div>
        )}

        {state.status === 'not_found' && (
          <div className="text-center py-section-gap px-mobile-margin" role="alert">
            <p className="text-body text-neutral-900">
              Este inmueble no fue encontrado
            </p>
            <Link
              href="/explorar"
              className="inline-block mt-4 text-primary text-body underline min-w-[44px] min-h-[44px] leading-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-card"
            >
              Volver a explorar
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <ErrorState onRetry={loadDetail} />
        )}

        {state.status === 'success' && (
          <>
            <PhotoGallery photos={state.data.photos} />
            <div className="mt-section-gap">
              <ListingDetailView listing={state.data} />
            </div>
            <div className="mt-section-gap pb-section-gap">
              <ContactLandlordButton listingId={state.data.id} />
            </div>
          </>
        )}
      </section>
    </>
  );
}
