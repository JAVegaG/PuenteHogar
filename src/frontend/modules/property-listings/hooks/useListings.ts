'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchListings } from '@/shared/services/api';
import type { ListingFilters, PaginatedListings } from '../types';

export function useListings(filters: ListingFilters) {
  const [data, setData] = useState<PaginatedListings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Serialize filters for stable useEffect dependency
  const filtersKey = JSON.stringify(filters);

  // Keep a ref to the latest AbortController so cleanup only aborts
  // the controller that belongs to *this* effect invocation.
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort the previous in-flight request (if any)
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetchListings(filters, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setError(err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    // Cleanup: abort only if this exact controller is still active
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, retryCount]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { data, isLoading, error, retry };
}
