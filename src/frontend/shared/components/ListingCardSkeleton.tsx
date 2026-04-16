export function ListingCardSkeleton() {
  return (
    <div className="border border-neutral-300 rounded-card overflow-hidden shadow-card">
      <div className="bg-neutral-100 animate-pulse aspect-[4/3]" />
      <div className="p-4 space-y-3">
        <div className="bg-neutral-100 animate-pulse h-6 w-3/5 rounded" />
        <div className="flex justify-between items-center">
          <div className="bg-neutral-100 animate-pulse h-5 w-1/3 rounded" />
          <div className="flex gap-1.5">
            <div className="bg-neutral-100 animate-pulse h-7 w-12 rounded-badge" />
            <div className="bg-neutral-100 animate-pulse h-7 w-12 rounded-badge" />
          </div>
        </div>
        <div className="bg-neutral-100 animate-pulse h-4 w-2/5 rounded" />
      </div>
    </div>
  );
}
