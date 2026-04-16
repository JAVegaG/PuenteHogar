import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Explorar Inmuebles - Plataforma de Arriendo',
  description: 'Encuentra tu próximo hogar. Explora inmuebles en arriendo en el Valle del Cauca, Colombia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans text-neutral-900 bg-white antialiased">
        <main>{children}</main>
      </body>
    </html>
  );
}
