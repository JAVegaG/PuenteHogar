'use client';

import Image from 'next/image';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import type { Photo } from '../types';

const GalleryModal = lazy(() => import('./GalleryModal'));

interface PhotoGalleryProps {
  photos: Photo[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const sortedPhotos = useMemo(() => {
    if (photos.length === 0) return [];
    const mainIndex = photos.findIndex((p) => p.isMain);
    if (mainIndex <= 0) return photos;
    const reordered = [...photos];
    const [main] = reordered.splice(mainIndex, 1);
    reordered.unshift(main);
    return reordered;
  }, [photos]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const total = sortedPhotos.length;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  if (total === 0) {
    return (
      <div className="mx-mobile-margin md:mx-desktop-margin">
        <div className="flex items-center justify-center w-full aspect-[4/3] bg-neutral-100 rounded-card text-body text-neutral-600">
          Sin fotografías disponibles
        </div>
      </div>
    );
  }

  const currentPhoto = sortedPhotos[currentIndex];

  return (
    <div className="mx-mobile-margin md:mx-desktop-margin">
      {/* Main image container */}
      <div className="relative w-full aspect-[4/3] rounded-card overflow-hidden">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="block w-full h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Ver foto ${currentIndex + 1} de ${total} en pantalla completa`}
        >
          <Image
            src={currentPhoto.fileUrl}
            alt={`Foto ${currentIndex + 1} de ${total} del inmueble`}
            fill
            sizes="(max-width: 768px) 100vw, calc(100vw - 104px)"
            className="object-cover"
            priority={currentIndex === 0}
          />
        </button>

        {/* Navigation buttons */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              aria-label="Foto anterior"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
              aria-label="Foto siguiente"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7.5 5L12.5 10L7.5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}

        {/* Position indicator */}
        {total > 1 && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/40 text-white text-small">
            {currentIndex + 1} / {total}
          </span>
        )}
      </div>

      {/* Navigation dots */}
      {total > 1 && (
        <div
          className="flex items-center justify-center gap-2 mt-3"
          role="tablist"
          aria-label="Navegación de fotos"
        >
          {sortedPhotos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Ir a foto ${index + 1}`}
              onClick={() => setCurrentIndex(index)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-primary'
                    : 'bg-neutral-300'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}

      {/* Gallery modal (lazy loaded) */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <GalleryModal
            photos={sortedPhotos}
            initialIndex={currentIndex}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
