interface ErrorStateProps {
  onRetry?: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="text-center py-section-gap">
      <p className="text-[18px] font-medium text-neutral-900">No pudimos cargar la información.</p>
      <p className="text-body text-neutral-600 mt-2">Intenta de nuevo.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-primary text-white rounded-card h-[56px] px-6 min-w-[44px] min-h-[44px] text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
