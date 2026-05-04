'use client';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  leftAction?: React.ReactNode;
  unreadNotificationCount?: number;
}

export function Header({ title, onMenuClick, leftAction, unreadNotificationCount }: HeaderProps) {
  const hasUnread = typeof unreadNotificationCount === 'number' && unreadNotificationCount > 0;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-300">
      <div className="flex items-center justify-between min-h-[56px] px-mobile-margin md:px-desktop-margin py-2">
        <div className="flex items-center min-w-[44px]">
          {leftAction ?? (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label={
                hasUnread
                  ? `Abrir menú (${unreadNotificationCount} notificaciones sin leer)`
                  : 'Abrir menú'
              }
              className="relative flex items-center justify-center w-[44px] h-[44px] rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              {hasUnread && (
                <span
                  className="absolute top-[6px] right-[6px] w-[10px] h-[10px] bg-red-500 rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          )}
        </div>

        <h1 className="text-h1 font-bold text-neutral-900 text-center flex-1">
          {title}
        </h1>

        {/* Spacer to keep title centered */}
        <div className="min-w-[44px]" />
      </div>
    </header>
  );
}
