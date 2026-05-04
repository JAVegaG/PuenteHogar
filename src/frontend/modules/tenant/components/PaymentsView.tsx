'use client';

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { useUnreadNotificationCount } from '@shared/hooks/useUnreadNotificationCount';
import { tenantService } from '@/shared/services/tenant';
import type { PaymentResponse } from '@/shared/services/tenant';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

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

export function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDueDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function PaymentsSkeleton() {
    return (
        <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando pagos...</span>
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-28" />
                </div>
            ))}
        </div>
    );
}

interface PaymentCardState {
    isSubmitting: boolean;
    successMessage: string | null;
    errorMessage: string | null;
}

export default function PaymentsView() {
    const { user, logout } = useAuth();
    const { unreadCount } = useUnreadNotificationCount();
    const [menuOpen, setMenuOpen] = useState(false);
    const [payments, setPayments] = useState<PaymentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cardStates, setCardStates] = useState<Record<string, PaymentCardState>>({});

    const roles = user?.roles ?? [];
    const hasTenantRole = roles.includes('TENANT');

    const sideMenuUser = user
        ? { name: user.displayName, role: translateRole(roles[0]), roles }
        : null;

    const fetchPayments = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await tenantService.getPaymentHistory(token);
            setPayments(data);
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
        if (hasTenantRole) {
            fetchPayments();
        } else {
            setIsLoading(false);
        }
    }, [hasTenantRole, fetchPayments]);

    const handlePay = useCallback(async (payment: PaymentResponse) => {
        const token = user?.accessToken;
        if (!token) return;

        setCardStates((prev) => ({
            ...prev,
            [payment.id]: { isSubmitting: true, successMessage: null, errorMessage: null },
        }));

        try {
            await tenantService.initiatePayment(
                { scheduledPaymentId: payment.scheduledPaymentId },
                token
            );
            setCardStates((prev) => ({
                ...prev,
                [payment.id]: {
                    isSubmitting: false,
                    successMessage: 'El pago ha sido iniciado exitosamente.',
                    errorMessage: null,
                },
            }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            setCardStates((prev) => ({
                ...prev,
                [payment.id]: {
                    isSubmitting: false,
                    successMessage: null,
                    errorMessage: message,
                },
            }));
        }
    }, [user?.accessToken, logout]);

    return (
        <>
            <Header title="Mis pagos" onMenuClick={() => setMenuOpen(true)} unreadNotificationCount={unreadCount} />

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
                    {!hasTenantRole ? (
                        <div className="text-center py-section-gap" role="alert">
                            <p className="text-h3 font-medium text-neutral-900">
                                No tienes permisos para ver esta página
                            </p>
                            <p className="text-body text-neutral-600 mt-2">
                                Esta sección es exclusiva para arrendatarios.
                            </p>
                        </div>
                    ) : (
                        <section aria-live="polite" aria-busy={isLoading}>
                            {isLoading ? (
                                <PaymentsSkeleton />
                            ) : error ? (
                                <ErrorState onRetry={fetchPayments} />
                            ) : payments.length === 0 ? (
                                <div className="text-center py-section-gap">
                                    <p className="text-h3 font-medium text-neutral-900">
                                        No tienes pagos registrados
                                    </p>
                                    <p className="text-body text-neutral-600 mt-2">
                                        Cuando tengas pagos programados, aparecerán aquí.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {payments.map((payment) => {
                                        const state = cardStates[payment.id];
                                        const isPending = payment.status === 'PENDING';
                                        const showPayButton = isPending && !state?.successMessage;

                                        return (
                                            <article
                                                key={payment.id}
                                                className="border border-neutral-300 rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-h3 font-semibold text-neutral-900">
                                                        {formatCOP(payment.amount)}
                                                    </p>
                                                    <StatusBadge status={payment.status} variant="paymentStatus" />
                                                </div>
                                                <p className="text-caption text-neutral-500 mt-1">
                                                    Vence: {formatDueDate(payment.dueDate)}
                                                </p>
                                                {payment.paymentDesc && (
                                                    <p className="text-caption text-neutral-600 mt-1">
                                                        {payment.paymentDesc}
                                                    </p>
                                                )}

                                                {showPayButton && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePay(payment)}
                                                        disabled={state?.isSubmitting}
                                                        className="mt-3 inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 text-body font-medium text-white bg-primary rounded-[6px] hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {state?.isSubmitting ? (
                                                            <>
                                                                <svg
                                                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    aria-hidden="true"
                                                                >
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                                Procesando…
                                                            </>
                                                        ) : (
                                                            'Pagar'
                                                        )}
                                                    </button>
                                                )}

                                                {state?.successMessage && (
                                                    <p className="mt-2 text-caption font-medium" style={{ color: '#065F46' }} role="status">
                                                        {state.successMessage}
                                                    </p>
                                                )}

                                                {state?.errorMessage && (
                                                    <p className="mt-2 text-caption font-medium" style={{ color: '#991B1B' }} role="alert">
                                                        {state.errorMessage}
                                                    </p>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}
