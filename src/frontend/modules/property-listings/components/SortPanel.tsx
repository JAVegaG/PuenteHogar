'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';

export interface SortPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: { sortBy: string; sortOrder: string };
  onApply: (sortBy: string, sortOrder: string) => void;
}

export interface SortOption {
  id: string;
  sortBy: string;
  sortOrder: string;
  title: string;
  description: string;
}

export const SORT_OPTIONS: SortOption[] = [
  {
    id: 'date-desc',
    sortBy: 'date',
    sortOrder: 'desc',
    title: 'Más recientes primero',
    description: 'Publicaciones más nuevas al inicio',
  },
  {
    id: 'date-asc',
    sortBy: 'date',
    sortOrder: 'asc',
    title: 'Más antiguos primero',
    description: 'Publicaciones más viejas al inicio',
  },
  {
    id: 'price-asc',
    sortBy: 'price',
    sortOrder: 'asc',
    title: 'Precio: menor a mayor',
    description: 'Más baratos primero',
  },
  {
    id: 'price-desc',
    sortBy: 'price',
    sortOrder: 'desc',
    title: 'Precio: mayor a menor',
    description: 'Más caros primero',
  },
];

function getSelectedId(sortBy: string, sortOrder: string): string {
  const match = SORT_OPTIONS.find(
    (opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder
  );
  return match?.id ?? 'date-desc';
}

export default function SortPanel({
  isOpen,
  onClose,
  currentSort,
  onApply,
}: SortPanelProps) {
  const [selectedId, setSelectedId] = useState(() =>
    getSelectedId(currentSort.sortBy, currentSort.sortOrder)
  );

  const handleApply = () => {
    const option = SORT_OPTIONS.find((opt) => opt.id === selectedId);
    if (option) {
      onApply(option.sortBy, option.sortOrder);
    }
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center border-b border-neutral-300 px-mobile-margin py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-card"
          aria-label="Volver"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="flex-1 text-center text-h1 font-bold text-neutral-900">Ordenar</h2>
        {/* Spacer for centering */}
        <div className="min-w-[44px]" />
      </header>

      {/* Sort options + Apply button */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-mobile-margin md:px-desktop-margin py-section-gap">
        <div
          className="max-w-[416px] mx-auto space-y-element-gap"
          role="radiogroup"
          aria-label="Opciones de ordenamiento"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.id === selectedId;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedId(option.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-card border min-h-[44px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary-50'
                    : 'border-neutral-300 bg-white'
                }`}
              >
                <div>
                  <p className="text-h3 font-semibold text-neutral-900">{option.title}</p>
                  <p className="text-caption text-neutral-600">{option.description}</p>
                </div>
                {isSelected && (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 ml-3"
                  >
                    <circle cx="12" cy="12" r="12" fill="#1D4ED8" />
                    <path
                      d="M7.5 12.5l3 3 6-6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}

          {/* Apply button */}
          <div className="pt-element-gap">
            <Button variant="primary" onClick={handleApply}>
              Aplicar ordenamiento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
