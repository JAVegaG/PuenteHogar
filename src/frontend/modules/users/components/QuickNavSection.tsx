'use client';

import Link from 'next/link';

interface QuickNavCard {
    title: string;
    description: string;
    href: string;
    icon: () => React.JSX.Element;
}

export function getQuickNavCards(roles: string[]): QuickNavCard[] {
    const cards: QuickNavCard[] = [];
    if (roles.includes('LANDLORD')) {
        cards.push({
            title: 'Ir a mi portafolio',
            description:
                'Gestiona tus propiedades, unidades y arriendos. Publica inmuebles para encontrar arrendatarios.',
            href: '/mi-portafolio',
            icon: PortfolioIcon,
        });
    }
    if (roles.includes('TENANT')) {
        cards.push({
            title: 'Ir a mis arriendos',
            description:
                'Consulta tus arriendos activos, contratos y pagos. Haz seguimiento del proceso de arriendo.',
            href: '/mis-arriendos',
            icon: LeaseIcon,
        });
    }
    return cards;
}

interface QuickNavSectionProps {
    roles: string[];
}

export default function QuickNavSection({ roles }: QuickNavSectionProps) {
    const cards = getQuickNavCards(roles);

    if (cards.length === 0) return null;

    return (
        <section aria-labelledby="quick-nav-title" className="mt-4">
            <h2
                id="quick-nav-title"
                className="text-h3 font-semibold text-neutral-900 mb-3"
            >
                Navegación rápida
            </h2>

            <div className="flex flex-col gap-3">
                {cards.map((card) => (
                    <Link
                        key={card.href}
                        href={card.href}
                        className="flex items-center gap-3 border border-[#d1d5db] rounded-[6px] p-4 min-h-[44px] bg-white hover:bg-[#f9fafb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                    >
                        <span className="flex-shrink-0 text-primary" aria-hidden="true">
                            <card.icon />
                        </span>

                        <span className="flex-1 min-w-0">
                            <span className="block text-body font-medium text-neutral-900">
                                {card.title}
                            </span>
                            <span className="block text-caption text-neutral-600 mt-0.5">
                                {card.description}
                            </span>
                        </span>

                        <span className="flex-shrink-0 text-neutral-400" aria-hidden="true">
                            <ArrowRightIcon />
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function PortfolioIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function LeaseIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}
