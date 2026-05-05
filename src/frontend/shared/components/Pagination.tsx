'use client';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <nav aria-label="Paginación" className="flex flex-col gap-4 py-4">
      {/* Results text */}
      <p className="text-caption text-neutral-600 text-center">
        Mostrando {from} a {to} de {total} resultados
      </p>

      {/* Page size selector */}
      <div className="flex items-center justify-center gap-2">
        <label htmlFor="page-size-select" className="text-caption text-neutral-600">
          Items por página:
        </label>
        <select
          id="page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="appearance-none text-caption text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-card pl-3 pr-8 py-1 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat"
        >
          <option value={9}>9</option>
          <option value={18}>18</option>
          <option value={27}>27</option>
        </select>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-card border border-neutral-300 text-caption text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ‹
          </button>

          {/* Page numbers */}
          {pageNumbers.map((item, idx) =>
            item === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-caption text-neutral-600"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item as number)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-card text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${item === page
                    ? 'bg-primary text-white'
                    : 'border border-neutral-300 text-neutral-600'
                  }`}
              >
                {item}
              </button>
            )
          )}

          {/* Next button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Página siguiente"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-card border border-neutral-300 text-caption text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ›
          </button>
        </div>
      )}
    </nav>
  );
}

/**
 * Builds an array of page numbers to display, with ellipsis for gaps.
 * Shows at most: first, last, current, and 1 neighbor on each side.
 */
function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | '...')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }

  return result;
}
