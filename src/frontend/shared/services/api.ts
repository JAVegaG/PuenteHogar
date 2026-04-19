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

export async function createListing(
  formData: FormData,
  token: string
): Promise<{ id: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/listings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error('Sesión expirada');
    if (res.status === 403) throw new Error('No tienes permiso para publicar este inmueble');
    if (res.status >= 500) throw new Error('Error del servidor. Intenta de nuevo más tarde.');
    throw new Error('Error del servidor. Intenta de nuevo más tarde.');
  }

  return res.json();
}
