'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/modules/users/context/AuthContext';
import { ConfirmationDialog } from '@/shared/components/ConfirmationDialog';
import { tenantService } from '@/shared/services/tenant';

interface ContactLandlordButtonProps {
    listingId: string;
}

export function ContactLandlordButton({ listingId }: ContactLandlordButtonProps) {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleClick = () => {
        setMessage(null);

        if (!isAuthenticated || !user) {
            router.push('/auth/login');
            return;
        }

        if (!user.roles.includes('TENANT')) {
            setMessage({
                type: 'error',
                text: 'Solo los arrendatarios pueden contactar arrendadores',
            });
            return;
        }

        setIsDialogOpen(true);
    };

    const handleConfirm = async () => {
        if (!user) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            await tenantService.transitionLeaseState(listingId, 'CONTACT_INITIATED', user.accessToken);
            setMessage({
                type: 'success',
                text: 'El contacto ha sido iniciado. El arrendador será notificado.',
            });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '';
            if (errorMessage === 'Recurso no encontrado') {
                setMessage({
                    type: 'error',
                    text: 'No se encontró un arriendo asociado a este inmueble',
                });
            } else {
                setMessage({
                    type: 'error',
                    text: 'Ocurrió un error al iniciar el contacto. Intenta de nuevo.',
                });
            }
        } finally {
            setIsProcessing(false);
            setIsDialogOpen(false);
        }
    };

    const handleCancel = () => {
        if (!isProcessing) {
            setIsDialogOpen(false);
        }
    };

    return (
        <div className="px-mobile-margin md:px-desktop-margin">
            <button
                type="button"
                onClick={handleClick}
                disabled={isProcessing}
                aria-busy={isProcessing}
                className="flex items-center justify-center w-full bg-primary text-white rounded-card h-[56px] min-w-[44px] min-h-[44px] text-body font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors gap-2"
            >
                {isProcessing && (
                    <svg
                        className="animate-spin h-[18px] w-[18px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                )}
                Contactar arrendador
            </button>

            {message && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className={`mt-3 p-3 rounded-card text-body ${message.type === 'success'
                            ? 'bg-green-50 text-green-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                >
                    {message.text}
                </div>
            )}

            <ConfirmationDialog
                isOpen={isDialogOpen}
                title="Contactar arrendador"
                message="¿Deseas iniciar el contacto con el arrendador de este inmueble?"
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                isLoading={isProcessing}
            />
        </div>
    );
}
