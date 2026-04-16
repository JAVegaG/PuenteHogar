import type { ListingFilters, PaginatedListings, ListingDetail } from '@modules/property-listings/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchListings(
  filters: ListingFilters,
  signal?: AbortSignal
): Promise<PaginatedListings> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const res = await fetch(`${API_URL}/listings?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Error al obtener inmuebles: ${res.status}`);
  return res.json();
}

export async function fetchListingDetail(
  id: string,
  signal?: AbortSignal
): Promise<ListingDetail> {
  const res = await fetch(`${API_URL}/listings/${id}`, { signal });
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND');
    throw new Error(`Error al obtener detalle: ${res.status}`);
  }
  return res.json();
}
