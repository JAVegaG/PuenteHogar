'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import LandlordRoute from '@modules/landlord-portfolio/components/LandlordRoute';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { useAuth } from '@modules/users/context/AuthContext';
import { useUnreadNotificationCount } from '@shared/hooks/useUnreadNotificationCount';
import { portfolioService } from '@/shared/services/portfolio';
import { formatPrice } from '@/shared/utils/formatPrice';
import { SummaryCard } from '@modules/landlord-accounting/components/SummaryCard';
import { PortfolioIncomeCard } from '@modules/landlord-accounting/components/PortfolioIncomeCard';
import type { PaginatedPortfolios } from '@modules/landlord-portfolio/types';
import type { PortfolioIncomeSummary } from '@modules/landlord-accounting/types';

const SideMenu = lazy(() =>
    import('@/shared/components/SideMenu').then((m) => ({ default: m.SideMenu }))
);

function translateRole(role: string): string {
    const map: Record<string, string> = {
        LANDLORD: 'Arrendador',
        TENANT: 'Arrendatario',
    };
    return map[role] || role;
}

function SummaryCardSkeleton() {
    return (
        <div className="rounded-[6px] p-[16px]" style={{ border: '1px solid #d1d5db' }}>
            <Skeleton className="h-4 w-24 mb-[4px]" />
            <Skeleton className="h-6 w-32" />
        </div>
    );
}

function PortfolioCardSkeleton() {
    return (
        <div
            className="rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-[16px]"
            style={{ border: '1px solid #d1d5db' }}
        >
            <Skeleton className="h-5 w-40 mb-[4px]" />
            <Skeleton className="h-4 w-24 mb-[8px]" />
            <Skeleton className="h-6 w-32 mb-[16px]" />
            <div className="flex gap-[8px]">
                <Skeleton className="h-[44px] w-[100px]" />
                <Skeleton className="h-[44px] w-[110px]" />
            </div>
        </div>
    );
}

function OverviewSkeleton() {
    return (
        <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando información de ingresos...</span>
            <div className="grid grid-cols-1 gap-[12px] mb-[24px]">
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
                <SummaryCardSkeleton />
            </div>
            <Skeleton className="h-6 w-36 mb-[16px]" />
            <div className="flex flex-col gap-[16px]">
                {[1, 2].map((i) => (
                    <PortfolioCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

function IncomeOverviewContent() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [portfolioData, setPortfolioData] = useState<PaginatedPortfolios | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, logout } = useAuth();
    const { unreadCount } = useUnreadNotificationCount();

    const sideMenuUser = user
        ? { name: user.displayName, role: translateRole(user.roles[0]), roles: user.roles }
        : null;

    const fetchPortfolios = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await portfolioService.getPortfolios(token, 1, 50);
            setPortfolioData(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [user?.accessToken, logout]);

    useEffect(() => {
        fetchPortfolios();
    }, [fetchPortfolios]);

    const portfolios: PortfolioIncomeSummary[] = portfolioData
        ? portfolioData.data.map((p) => ({
            id: p.id,
            name: p.name,
            totalUnits: p.totalUnits,
            activeLeases: p.activeLeases,
            monthlyIncome: 0,
        }))
        : [];

    const totalMonthlyIncome = portfolios.reduce((sum, p) => sum + p.monthlyIncome, 0);
    const totalUnits = portfolioData?.globalTotalUnits ?? 0;
    const totalActiveLeases = portfolioData?.globalActiveLeases ?? 0;

    return (
        <>
            <Header title="Mis ingresos" onMenuClick={() => setMenuOpen(true)} unreadNotificationCount={unreadCount} />

            <Suspense fallback={null}>
                {menuOpen && (
                    <SideMenu
                        isOpen={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        user={sideMenuUser}
                        onLogout={user ? logout : undefined}
                        unreadNotificationCount={unreadCount}
                    />
                )}
            </Suspense>

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <OverviewSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchPortfolios} />
                        ) : portfolioData && portfolioData.data.length === 0 ? (
                            <div className="text-center py-section-gap">
                                <p className="text-body font-medium" style={{ color: '#111827' }}>
                                    No tienes portafolios registrados
                                </p>
                                <p className="text-caption mt-2" style={{ color: '#4b5563' }}>
                                    Crea tu primer portafolio en &quot;Mis arriendos&quot; para comenzar a ver tus ingresos.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-[12px] mb-[24px]">
                                    <SummaryCard
                                        label="Ingresos del mes"
                                        value={`$${formatPrice(totalMonthlyIncome)}`}
                                    />
                                    <SummaryCard
                                        label="Total inmuebles"
                                        value={String(totalUnits)}
                                    />
                                    <SummaryCard
                                        label="Arriendos activos"
                                        value={String(totalActiveLeases)}
                                    />
                                </div>

                                <section aria-label="Mis portafolios">
                                    <h2 className="text-h3 font-semibold mb-[16px]" style={{ color: '#111827' }}>
                                        Mis portafolios
                                    </h2>
                                    <div className="flex flex-col gap-[16px]">
                                        {portfolios.map((portfolio) => (
                                            <PortfolioIncomeCard key={portfolio.id} portfolio={portfolio} />
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

export default function IncomeOverviewPage() {
    return (
        <LandlordRoute>
            <IncomeOverviewContent />
        </LandlordRoute>
    );
}
