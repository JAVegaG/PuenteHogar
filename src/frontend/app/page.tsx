import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Navigation */}
      <nav className="w-full px-mobile-margin md:px-desktop-margin py-3 border-b border-neutral-300 bg-white">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-h3 font-bold text-neutral-900">
            PuenteHogar
          </Link>
          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-6">
            <li>
              <Link
                href="/explorar"
                className="text-body text-neutral-600 hover:text-primary min-h-[44px] inline-flex items-center"
              >
                Explorar
              </Link>
            </li>
            <li>
              <Link
                href="/auth/login"
                className="text-body text-neutral-600 hover:text-primary min-h-[44px] inline-flex items-center"
              >
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link
                href="/auth/registro"
                className="text-body font-semibold text-primary hover:text-primary/80 min-h-[44px] inline-flex items-center"
              >
                Registrarse
              </Link>
            </li>
          </ul>
          {/* Mobile: only show key actions */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/auth/login"
              className="text-caption text-neutral-600 hover:text-primary min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              Ingresar
            </Link>
            <Link
              href="/auth/registro"
              className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] px-3 inline-flex items-center justify-center font-semibold text-caption"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col px-mobile-margin md:px-desktop-margin">
        <section className="flex flex-col items-center text-center pt-12 md:pt-20 pb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#DBEAFE] flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="md:w-10 md:h-10">
              <path
                d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 21V12h6v9"
                stroke="#1d4ed8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-h1 font-bold text-neutral-900 mb-3 max-w-[480px]">
            Encuentra tu hogar ideal en Colombia
          </h1>
          <p className="text-body text-neutral-600 max-w-[480px] mb-8 leading-relaxed">
            PuenteHogar facilita el arriendo de vivienda urbana en el Valle del
            Cauca. Conectamos arrendadores y arrendatarios de forma sencilla,
            segura y accesible para todos.
          </p>
          <Link
            href="/explorar"
            className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[48px] min-w-[44px] px-8 inline-flex items-center justify-center font-semibold text-body shadow-sm hover:bg-[#1e40af] transition-colors"
          >
            Buscar inmuebles
          </Link>
        </section>

        {/* Value propositions */}
        <section className="py-8 md:py-12 border-t border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[720px] mx-auto">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 12l2 2 4-4" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="text-body font-semibold text-neutral-900 mb-1">Sencillo</h3>
              <p className="text-caption text-neutral-600">
                Publica o busca inmuebles en pocos pasos, sin complicaciones.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[#DBEAFE] flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-body font-semibold text-neutral-900 mb-1">Seguro</h3>
              <p className="text-caption text-neutral-600">
                Contratos digitales con firma electrónica y seguimiento del proceso.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="7" r="4" stroke="#d97706" strokeWidth="2" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-body font-semibold text-neutral-900 mb-1">Accesible</h3>
              <p className="text-caption text-neutral-600">
                Diseñado para todos, incluyendo personas con baja alfabetización digital.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-mobile-margin md:px-desktop-margin py-6 border-t border-neutral-200 text-center">
        <p className="text-caption text-neutral-500">
          © 2026 PuenteHogar — Plataforma de arriendo de vivienda urbana
        </p>
      </footer>
    </div>
  );
}
