'use client';

import { lazy, Suspense, useState, useCallback } from 'react';
import { SORT_OPTIONS } from './SortPanel';
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock';
import type { ListingFilters } from '../types';

const FilterPanel = lazy(() => import('./FilterPanel'));
const SortPanel = lazy(() => import('./SortPanel'));

export interface ActionBarProps {
  currentFilters: ListingFilters;
  currentSort: { sortBy: string; sortOrder: string };
  onApplyFilters: (filters: ListingFilters) => void;
  onClearFilters: () => void;
  onApplySort: (sortBy: string, sortOrder: string) => void;
}

function getSortLabel(sortBy: string, sortOrder: string): string {
  const match = SORT_OPTIONS.find(
    (opt) => opt.sortBy === sortBy && opt.sortOrder === sortOrder
  );
  return match?.title ?? 'Más recientes primero';
}

export default function ActionBar({
  currentFilters,
  currentSort,
  onApplyFilters,
  onClearFilters,
  onApplySort,
}: ActionBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useBodyScrollLock(isFilterOpen || isSortOpen);

  const openFilters = useCallback(() => setIsFilterOpen(true), []);
  const closeFilters = useCallback(() => setIsFilterOpen(false), []);
  const openSort = useCallback(() => setIsSortOpen(true), []);
  const closeSort = useCallback(() => setIsSortOpen(false), []);

  const sortLabel = getSortLabel(currentSort.sortBy, currentSort.sortOrder);

  return (
    <>
      <div className="flex gap-element-gap px-mobile-margin md:px-desktop-margin py-3">
        <button
          type="button"
          onClick={openFilters}
          className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-card bg-white text-body text-neutral-900 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Abrir filtros"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 5h14M5 10h10M7 15h6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Filtros
        </button>

        <button
          type="button"
          onClick={openSort}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-neutral-300 rounded-card bg-white text-body text-neutral-900 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Abrir ordenamiento"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 6h14M3 10h10M3 14h6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {sortLabel}
        </button>
      </div>

      <Suspense fallback={null}>
        {isFilterOpen && (
          <FilterPanel
            isOpen={isFilterOpen}
            onClose={closeFilters}
            currentFilters={currentFilters}
            onApply={onApplyFilters}
            onClear={onClearFilters}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isSortOpen && (
          <SortPanel
            isOpen={isSortOpen}
            onClose={closeSort}
            currentSort={currentSort}
            onApply={onApplySort}
          />
        )}
      </Suspense>
    </>
  );
}
