interface ErrorStateProps {
  onRetry?: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="text-center py-section-gap">
      <p className="text-body text-neutral-900">No pudimos cargar los inmuebles.</p>
      <p className="text-caption text-neutral-600 mt-2">Intenta de nuevo.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-primary text-white rounded-card h-[56px] px-6 min-w-[44px] min-h-[44px]"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
