'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock';

import type { Photo } from '../types';

interface GalleryModalProps {
  photos: Photo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function GalleryModal({
  photos,
  initialIndex,
  isOpen,
  onClose,
}: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const total = photos.length;

  useBodyScrollLock(isOpen);

  // Reset index when initialIndex changes (e.g. modal reopened on different photo)
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  // Keyboard navigation: Escape to close, arrows to navigate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  if (!isOpen || total === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de fotos ampliada"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Cerrar galería"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Position indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-small">
        {currentIndex + 1} / {total}
      </div>

      {/* Main image area with navigation */}
      <div className="flex-1 flex items-center justify-center relative px-16">
        {/* Previous button */}
        {total > 1 && (
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Foto anterior"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Enlarged image */}
        <div className="relative w-full max-w-4xl aspect-[4/3]">
          <Image
            src={currentPhoto.fileUrl}
            alt={`Foto ${currentIndex + 1} de ${total} del inmueble`}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Next button */}
        {total > 1 && (
          <button
            type="button"
            onClick={goToNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Foto siguiente"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 6L15 12L9 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnails strip */}
      {total > 1 && (
        <div className="py-3 px-4">
          <div
            className="flex items-center justify-center gap-2 overflow-x-auto"
            role="tablist"
            aria-label="Miniaturas de fotos"
          >
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Ir a foto ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  index === currentIndex
                    ? 'ring-2 ring-primary opacity-100'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Image
                  src={photo.fileUrl}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
