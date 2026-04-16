'use client';

import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: { name: string; role: string } | null;
}

const NAV_LINKS = [
  { label: 'Explorar inmuebles', href: '/explorar', icon: SearchIcon },
  { label: 'Mis arriendos', href: '/mis-arriendos', icon: HomeIcon },
  { label: 'Mis ingresos', href: '/mis-ingresos', icon: WalletIcon },
  { label: 'Mis contratos', href: '/mis-contratos', icon: FileIcon },
  { label: 'Mi perfil', href: '/mi-perfil', icon: UserIcon },
];

export function SideMenu({ isOpen, onClose, user }: SideMenuProps) {
  useBodyScrollLock(isOpen);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`fixed top-0 left-0 z-50 h-full w-[320px] bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[56px] px-mobile-margin border-b border-neutral-300">
          <span className="text-h2 text-neutral-900">Menú</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex items-center justify-center w-[44px] h-[44px]"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-56px)] overflow-y-auto">
          {user ? (
            <>
              {/* Authenticated user info */}
              <div className="flex items-center gap-element-gap px-mobile-margin py-section-gap border-b border-neutral-300">
                <div className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-neutral-100 text-neutral-600 shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <p className="text-body font-semibold text-neutral-900">{user.name}</p>
                  <p className="text-caption text-neutral-600">{user.role}</p>
                </div>
              </div>

              {/* Navigation links */}
              <div className="flex-1 py-element-gap">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-element-gap px-mobile-margin py-3 text-body text-neutral-900 hover:bg-neutral-50 min-h-[44px]"
                  >
                    <link.icon />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>

              {/* Logout */}
              <div className="border-t border-neutral-300 py-element-gap">
                <a
                  href="/auth/login"
                  className="flex items-center gap-element-gap px-mobile-margin py-3 text-body text-neutral-900 hover:bg-neutral-50 min-h-[44px]"
                >
                  <LogoutIcon />
                  <span>Cerrar sesión</span>
                </a>
              </div>
            </>
          ) : (
            <>
              {/* Anonymous user */}
              <div className="flex-1 py-element-gap">
                <a
                  href="/explorar"
                  className="flex items-center gap-element-gap px-mobile-margin py-3 text-body text-neutral-900 hover:bg-neutral-50 min-h-[44px]"
                >
                  <SearchIcon />
                  <span>Explorar inmuebles</span>
                </a>
              </div>

              <div className="border-t border-neutral-300 py-element-gap">
                <a
                  href="/auth/login"
                  className="flex items-center gap-element-gap px-mobile-margin py-3 text-body text-neutral-900 hover:bg-neutral-50 min-h-[44px]"
                >
                  <LoginIcon />
                  <span>Iniciar sesión</span>
                </a>
                <a
                  href="/auth/registro"
                  className="flex items-center gap-element-gap px-mobile-margin py-3 text-body text-neutral-900 hover:bg-neutral-50 min-h-[44px]"
                >
                  <RegisterIcon />
                  <span>Registrarse</span>
                </a>
              </div>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

/* ── Icon Components ── */

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function RegisterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}
