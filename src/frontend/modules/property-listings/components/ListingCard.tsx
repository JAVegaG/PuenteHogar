import Image from 'next/image';
import Link from 'next/link';

import { formatPrice } from '@/shared/utils/formatPrice';
import { formatRelativeDate } from '@/shared/utils/formatRelativeDate';

import type { Listing, Photo } from '../types';

interface ListingCardProps {
  listing: Listing;
}

export function getMainPhoto(photos: Photo[]): Photo | null {
  if (photos.length === 0) return null;
  const candidate = photos.find((p) => p.isMain) ?? photos[0];
  // Validate the URL has a proper hostname (MVP stubs may produce malformed URLs)
  try {
    const url = new URL(candidate.fileUrl);
    if (!url.hostname || url.hostname.startsWith('.')) return null;
  } catch {
    return null;
  }
  return candidate;
}

export function formatTitle(
  propertyType: string | null,
  neighborhood: string | null,
): string {
  if (propertyType && neighborhood) return `${propertyType} · ${neighborhood}`;
  if (propertyType) return propertyType;
  if (neighborhood) return neighborhood;
  return 'Inmueble';
}

export default function ListingCard({ listing }: ListingCardProps) {
  const mainPhoto = getMainPhoto(listing.photos);
  const displayTitle = listing.title || formatTitle(listing.propertyType, listing.neighborhood);

  return (
    <article className="border border-neutral-300 rounded-card shadow-card bg-white overflow-hidden">
      <Link
        href={`/explorar/${listing.id}`}
        className="block min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-card"
      >
        {mainPhoto ? (
          <div className="relative w-full aspect-[4/3]">
            <Image
              src={mainPhoto.fileUrl}
              alt={displayTitle}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full aspect-[4/3] bg-neutral-100 text-caption text-neutral-600">
            Sin fotografía disponible
          </div>
        )}

        <div className="p-4 space-y-2">
          <h2 className="text-h2 font-bold text-neutral-900">{displayTitle}</h2>

          <div className="flex items-center justify-between">
            <h3 className="text-h3 font-semibold text-primary">
              {formatPrice(listing.price)}
            </h3>

            <div className="flex gap-1.5">
              {listing.numberOfRooms !== null && (
                <span className="inline-flex items-center gap-1.5 bg-neutral-100 rounded-badge px-2 py-1 text-caption text-neutral-600">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 10V5a1 1 0 011-1h10a1 1 0 011 1v5M2 10v3M2 10h12M14 10v3M1 10h14M5 7V6M11 7V6"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {listing.numberOfRooms}
                </span>
              )}
              {listing.numberOfBathrooms !== null && (
                <span className="inline-flex items-center gap-1.5 bg-neutral-100 rounded-badge px-2 py-1 text-caption text-neutral-600">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 8h12a1 1 0 011 1v1a3 3 0 01-3 3H4a3 3 0 01-3-1V9a1 1 0 011-1zM3 8V4a2 2 0 012-2h1a1 1 0 011 1v1"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {listing.numberOfBathrooms}
                </span>
              )}
            </div>
          </div>

          <p className="text-caption text-neutral-600">
            {formatRelativeDate(listing.listingDate)}
          </p>
        </div>
      </Link>
    </article>
  );
}
