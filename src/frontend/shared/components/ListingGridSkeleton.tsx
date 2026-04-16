import { ListingCardSkeleton } from './ListingCardSkeleton';

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      role="status"
      aria-busy="true"
      aria-label="Cargando inmuebles"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
