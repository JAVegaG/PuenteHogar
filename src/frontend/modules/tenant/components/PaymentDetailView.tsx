'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { tenantService } from '@/shared/services/tenant';
import type { PaymentDetailResponse } from '@/shared/services/tenant';
import { Header } from '@/shared/components/Header';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusBadge } from '@/shared/components/StatusBadge';

function formatCOP(amount: number): string {
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

type PaymentMethod = 'CARD' | 'PSE';

function DetailSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando detalle del pago...</span>
            <div className="border border-neutral-200 rounded-card bg-white p-4">
                <Skeleton className="h-5 w-40 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-32" />
            </div>
            <div className="border border-neutral-200 rounded-card bg-white p-4">
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}

export default function PaymentDetailView() {
    const { unitId, paymentId } = useParams<{ unitId: string; paymentId: string }>();
    const { user, logout } = useAuth();
    const [data, setData] = useState<PaymentDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');

    const fetchDetail = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await tenantService.getPaymentDetail(paymentId, token);
            setData(result);
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
    }, [paymentId, user?.accessToken, logout]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const backArrow = (
        <Link
            href={`/mis-pagos/${unitId}`}
            aria-label="Volver al historial de pagos"
            className="flex items-center justify-center w-[44px] h-[44px] rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
            </svg>
        </Link>
    );

    return (
        <>
            <Header
                title="Detalle del pago"
                onMenuClick={() => { }}
                leftAction={backArrow}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    <section aria-live="polite" aria-busy={isLoading}>
                        {isLoading ? (
                            <DetailSkeleton />
                        ) : error ? (
                            <ErrorState onRetry={fetchDetail} />
                        ) : data ? (
                            <div className="flex flex-col gap-6">
                                {data.isPending ? (
                                    /* PENDING payment view */
                                    <>
                                        {/* Line items summary */}
                                        <section aria-label="Resumen de la cuota">
                                            <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                                Resumen de la cuota
                                            </h2>
                                            <div className="border border-neutral-200 rounded-card bg-white p-4">
                                                <ul className="flex flex-col gap-3">
                                                    {data.lineItems.map((item, index) => (
                                                        <li key={index} className="flex items-center justify-between">
                                                            <span className="text-body text-neutral-700">
                                                                {item.description}
                                                            </span>
                                                            <span className="text-body font-medium text-neutral-900">
                                                                {formatCOP(item.amount)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="border-t border-neutral-200 mt-3 pt-3 flex items-center justify-between">
                                                    <span className="text-body font-semibold text-neutral-900">
                                                        Total
                                                    </span>
                                                    <span className="text-h2 font-bold text-neutral-900">
                                                        {formatCOP(data.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Due date warning */}
                                        <div
                                            className="border border-amber-300 bg-amber-50 rounded-card p-4"
                                            role="alert"
                                        >
                                            <p className="text-body text-amber-800 font-medium">
                                                Fecha de vencimiento: {formatDueDate(data.dueDate)}
                                            </p>
                                        </div>

                                        {/* Payment method selection */}
                                        <section aria-label="Método de pago">
                                            <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                                Método de pago
                                            </h2>
                                            <div className="flex flex-col gap-3">
                                                <label
                                                    className={`flex items-center gap-3 border rounded-card p-4 cursor-pointer min-h-[44px] transition-colors ${selectedMethod === 'CARD'
                                                        ? 'border-[#1d4ed8] bg-blue-50'
                                                        : 'border-neutral-200 bg-white'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="CARD"
                                                        checked={selectedMethod === 'CARD'}
                                                        onChange={() => setSelectedMethod('CARD')}
                                                        className="w-[20px] h-[20px] accent-[#1d4ed8]"
                                                    />
                                                    <span className="text-body text-neutral-900">
                                                        Tarjeta débito/crédito
                                                    </span>
                                                </label>
                                                <label
                                                    className={`flex items-center gap-3 border rounded-card p-4 cursor-pointer min-h-[44px] transition-colors ${selectedMethod === 'PSE'
                                                        ? 'border-[#1d4ed8] bg-blue-50'
                                                        : 'border-neutral-200 bg-white'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="PSE"
                                                        checked={selectedMethod === 'PSE'}
                                                        onChange={() => setSelectedMethod('PSE')}
                                                        className="w-[20px] h-[20px] accent-[#1d4ed8]"
                                                    />
                                                    <span className="text-body text-neutral-900">
                                                        Transferencia bancaria / PSE
                                                    </span>
                                                </label>
                                            </div>
                                        </section>

                                        {/* Continue with payment button */}
                                        <button
                                            type="button"
                                            className="bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold text-body w-full"
                                        >
                                            Continuar con pago
                                        </button>
                                    </>
                                ) : (
                                    /* PAID payment view — read-only receipt */
                                    <>
                                        {/* Receipt header */}
                                        <section aria-label="Comprobante de pago">
                                            <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                                Comprobante de pago
                                            </h2>
                                            <div className="border border-neutral-200 rounded-card bg-white p-4">
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <p className="text-h2 font-bold text-neutral-900">
                                                        {formatCOP(data.amount)}
                                                    </p>
                                                    <StatusBadge status={data.status} variant="paymentStatus" />
                                                </div>
                                                {data.datePaid && (
                                                    <p className="text-caption text-neutral-600 mb-1">
                                                        Fecha de pago: {formatDueDate(data.datePaid)}
                                                    </p>
                                                )}
                                                {data.paymentMethod && (
                                                    <p className="text-caption text-neutral-600 mb-1">
                                                        Método: {data.paymentMethod === 'CARD' ? 'Tarjeta débito/crédito' : 'Transferencia bancaria / PSE'}
                                                    </p>
                                                )}
                                            </div>
                                        </section>

                                        {/* Line items */}
                                        <section aria-label="Detalle de la cuota">
                                            <h2 className="text-h3 font-semibold text-neutral-900 mb-3">
                                                Detalle de la cuota
                                            </h2>
                                            <div className="border border-neutral-200 rounded-card bg-white p-4">
                                                <ul className="flex flex-col gap-3">
                                                    {data.lineItems.map((item, index) => (
                                                        <li key={index} className="flex items-center justify-between">
                                                            <span className="text-body text-neutral-700">
                                                                {item.description}
                                                            </span>
                                                            <span className="text-body font-medium text-neutral-900">
                                                                {formatCOP(item.amount)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="border-t border-neutral-200 mt-3 pt-3 flex items-center justify-between">
                                                    <span className="text-body font-semibold text-neutral-900">
                                                        Total
                                                    </span>
                                                    <span className="text-h2 font-bold text-neutral-900">
                                                        {formatCOP(data.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Receipt link */}
                                        {data.receiptUrl && (
                                            <a
                                                href={data.receiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center text-body font-medium text-[#1d4ed8] hover:underline min-h-[44px] min-w-[44px]"
                                            >
                                                Descargar comprobante
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : null}
                    </section>
                </div>
            </main>
        </>
    );
}
