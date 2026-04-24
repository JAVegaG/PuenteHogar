import { formatPrice } from '@/shared/utils/formatPrice';

import type { ListingDetail } from '../types';
import PropertyInfoGrid from './PropertyInfoGrid';

interface ListingDetailViewProps {
  listing: ListingDetail;
}

export default function ListingDetailView({ listing }: ListingDetailViewProps) {
  const additionalFeatures = (listing as ListingDetail & { additionalFeatures?: string[] }).additionalFeatures;

  const addressText = listing.address
    ? [listing.address.address, listing.address.neighborhood, listing.address.city, listing.address.state]
      .filter(Boolean)
      .join(', ')
    : null;

  return (
    <div className="px-mobile-margin md:px-desktop-margin space-y-section-gap">
      {/* Price + Title */}
      <section>
        <h2 className="text-h2 font-bold text-primary">{formatPrice(listing.price)}/mes</h2>
        <h3 className="text-h3 font-semibold text-neutral-900 mt-1">{listing.title}</h3>
      </section>

      {/* Property Info Grid */}
      <section>
        <PropertyInfoGrid
          rooms={listing.numberOfRooms}
          bathrooms={listing.numberOfBathrooms}
          area={null}
        />
      </section>

      {/* Descripción */}
      {listing.description && (
        <section>
          <h3 className="text-h3 font-semibold text-neutral-900">Descripción</h3>
          <p className="text-body text-neutral-600 mt-2">{listing.description}</p>
        </section>
      )}

      {/* Características */}
      {additionalFeatures && additionalFeatures.length > 0 && (
        <section>
          <h3 className="text-h3 font-semibold text-neutral-900">Características</h3>
          <div className="grid grid-cols-2 gap-element-gap mt-2">
            {additionalFeatures.map((feature) => (
              <span
                key={feature}
                className="bg-neutral-100 rounded-badge px-4 py-[7.5px] text-body"
              >
                {feature}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Ubicación */}
      {addressText && (
        <section>
          <h3 className="text-h3 font-semibold text-neutral-900">Ubicación</h3>
          <div className="flex items-start gap-2 mt-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="shrink-0 mt-0.5 text-neutral-600"
            >
              <path
                d="M10 10.833a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 17.5s6.25-4.375 6.25-9.167a6.25 6.25 0 10-12.5 0C3.75 13.125 10 17.5 10 17.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-body text-neutral-600">{addressText}</span>
          </div>
        </section>
      )}


    </div>
  );
}
