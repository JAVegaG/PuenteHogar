export function ListingDetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando detalle del inmueble">
      {/* Gallery placeholder */}
      <div className="bg-neutral-100 animate-pulse w-full aspect-[16/9] rounded-card" />

      <div className="mt-6 space-y-6">
        {/* Price */}
        <div className="bg-neutral-100 animate-pulse h-7 w-2/5 rounded" />
        {/* Title */}
        <div className="bg-neutral-100 animate-pulse h-6 w-3/5 rounded" />

        {/* Info grid: rooms / bathrooms / area */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-100 animate-pulse h-20 rounded-card" />
          <div className="bg-neutral-100 animate-pulse h-20 rounded-card" />
          <div className="bg-neutral-100 animate-pulse h-20 rounded-card" />
        </div>

        {/* Description section */}
        <div className="space-y-3">
          <div className="bg-neutral-100 animate-pulse h-5 w-1/3 rounded" />
          <div className="bg-neutral-100 animate-pulse h-4 w-full rounded" />
          <div className="bg-neutral-100 animate-pulse h-4 w-4/5 rounded" />
          <div className="bg-neutral-100 animate-pulse h-4 w-3/5 rounded" />
        </div>

        {/* Characteristics section */}
        <div className="space-y-3">
          <div className="bg-neutral-100 animate-pulse h-5 w-1/3 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-100 animate-pulse h-10 rounded-badge" />
            <div className="bg-neutral-100 animate-pulse h-10 rounded-badge" />
            <div className="bg-neutral-100 animate-pulse h-10 rounded-badge" />
            <div className="bg-neutral-100 animate-pulse h-10 rounded-badge" />
          </div>
        </div>

        {/* Location section */}
        <div className="space-y-3">
          <div className="bg-neutral-100 animate-pulse h-5 w-1/4 rounded" />
          <div className="bg-neutral-100 animate-pulse h-4 w-3/5 rounded" />
        </div>

        {/* Contact button */}
        <div className="bg-neutral-100 animate-pulse h-14 w-full rounded-card" />
      </div>
    </div>
  );
}
