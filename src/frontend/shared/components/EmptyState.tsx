export function EmptyState() {
  return (
    <div role="status" aria-live="polite" className="text-center py-section-gap">
      <p className="text-[18px] font-medium text-neutral-900">No se encontraron inmuebles</p>
      <p className="text-body text-neutral-600 mt-2">
        Intenta ajustar los filtros de búsqueda.
      </p>
    </div>
  );
}
