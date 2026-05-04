import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Navigation */}
      <nav className="w-full px-mobile-margin md:px-desktop-margin py-4 flex items-center justify-between border-b border-neutral-300 bg-white">
        <Link href="/" className="text-h3 font-semibold text-neutral-900">
          PuenteHogar
        </Link>
        <ul className="flex items-center gap-4">
          <li>
            <Link
              href="/explorar"
              className="text-body text-neutral-600 hover:text-primary min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              Explorar
            </Link>
          </li>
          <li>
            <Link
              href="/auth/login"
              className="text-body text-neutral-600 hover:text-primary min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              Iniciar sesión
            </Link>
          </li>
          <li>
            <Link
              href="/auth/registro"
              className="text-body text-neutral-600 hover:text-primary min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              Registrarse
            </Link>
          </li>
        </ul>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-mobile-margin md:px-desktop-margin py-16 text-center">
        <h1 className="text-h1 font-bold text-neutral-900 mb-4">
          Encuentra tu hogar ideal en Colombia
        </h1>
        <p className="text-body text-neutral-600 max-w-[560px] mb-8">
          PuenteHogar facilita el arriendo de vivienda urbana en el Valle del
          Cauca. Conectamos arrendadores y arrendatarios de forma sencilla,
          segura y accesible para todos.
        </p>
        <Link
          href="/explorar"
          className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold text-body"
        >
          Buscar inmuebles
        </Link>
      </main>
    </div>
  );
}
