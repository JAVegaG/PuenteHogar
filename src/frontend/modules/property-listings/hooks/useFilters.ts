'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ListingFilters } from '../types';

const NUMERIC_KEYS: (keyof ListingFilters)[] = [
  'priceMin',
  'priceMax',
  'rooms',
  'bathrooms',
  'areaMin',
  'areaMax',
  'page',
  'pageSize',
];

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: ListingFilters = useMemo(() => {
    const f: ListingFilters = {};
    searchParams.forEach((value, key) => {
      if (NUMERIC_KEYS.includes(key as keyof ListingFilters)) {
        (f as any)[key] = Number(value);
      } else {
        (f as any)[key] = value;
      }
    });
    return f;
  }, [searchParams]);

  const updateURL = useCallback(
    (newFilters: ListingFilters) => {
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname],
  );

  const setFilter = useCallback(
    (key: keyof ListingFilters, value: string | number | undefined) => {
      const newFilters = { ...filters, [key]: value, page: 1 };
      if (value === undefined || value === '') delete (newFilters as any)[key];
      updateURL(newFilters);
    },
    [filters, updateURL],
  );

  const clearFilters = useCallback(() => {
    updateURL({});
  }, [updateURL]);

  const setSort = useCallback(
    (sortBy: string, sortOrder: string) => {
      updateURL({ ...filters, sortBy: sortBy as any, sortOrder: sortOrder as any, page: 1 });
    },
    [filters, updateURL],
  );

  const setPage = useCallback(
    (page: number) => {
      updateURL({ ...filters, page });
    },
    [filters, updateURL],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      updateURL({ ...filters, pageSize, page: 1 });
    },
    [filters, updateURL],
  );

  return { filters, setFilter, clearFilters, setSort, setPage, setPageSize };
}
