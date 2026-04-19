'use client';

import { useState } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { validateLeaseForm } from '../validation';
import { leaseService } from '@/shared/services/lease';
import type { UnitInfo } from '../types';
import { Button } from '@/shared/components/Button';

interface LeaseCreateFormProps {
    unit: UnitInfo;
    portfolioId: string;
    unitId: string;
    onSuccess: () => void;
}

export function LeaseCreateForm({ portfolioId, unitId, onSuccess }: LeaseCreateFormProps) {
    const { user, logout } = useAuth();
    const [tenantEmail, setTenantEmail] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFieldChange = (field: string, value: string) => {
        if (field === 'tenantEmail') setTenantEmail(value);
        if (field === 'startDate') setStartDate(value);
        if (field === 'endDate') setEndDate(value);

        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError(null);
        setSuccessMessage(null);

        const validationErrors = validateLeaseForm({ tenantEmail, startDate, endDate });
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        const token = user?.accessToken;
        if (!token) {
            logout();
            return;
        }

        try {
            await leaseService.createLease(
                portfolioId,
                unitId,
                {
                    tenantEmail: tenantEmail.trim(),
                    startDate,
                    endDate: endDate.trim() || undefined,
                },
                token
            );
            setSuccessMessage('¡Arriendo creado exitosamente!');
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error inesperado';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            setServerError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fieldBorderClass = (field: string) =>
        errors[field]
            ? 'border-red-600 focus:ring-red-600'
            : 'border-gray-300 focus:ring-primary';

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            {serverError && (
                <div
                    role="alert"
                    className="rounded-md bg-red-50 border border-red-200 p-3 text-caption text-red-700"
                >
                    {serverError}
                </div>
            )}

            {successMessage && (
                <div
                    role="status"
                    className="rounded-md bg-green-50 border border-green-200 p-3 text-caption text-green-700"
                >
                    {successMessage}
                </div>
            )}

            {/* Correo electrónico del arrendatario */}
            <div>
                <label
                    htmlFor="tenantEmail"
                    className="block text-caption font-medium text-gray-700 mb-1"
                >
                    Correo electrónico del arrendatario
                </label>
                <input
                    id="tenantEmail"
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => handleFieldChange('tenantEmail', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    aria-describedby={errors.tenantEmail ? 'tenantEmail-error' : undefined}
                    disabled={isSubmitting}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('tenantEmail')}`}
                />
                {errors.tenantEmail && (
                    <p
                        id="tenantEmail-error"
                        aria-live="polite"
                        className="mt-1 text-[14px] text-red-600"
                    >
                        {errors.tenantEmail}
                    </p>
                )}
            </div>

            {/* Fecha de inicio */}
            <div>
                <label
                    htmlFor="startDate"
                    className="block text-caption font-medium text-gray-700 mb-1"
                >
                    Fecha de inicio
                </label>
                <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleFieldChange('startDate', e.target.value)}
                    aria-describedby={errors.startDate ? 'startDate-error' : undefined}
                    disabled={isSubmitting}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('startDate')}`}
                />
                {errors.startDate && (
                    <p
                        id="startDate-error"
                        aria-live="polite"
                        className="mt-1 text-[14px] text-red-600"
                    >
                        {errors.startDate}
                    </p>
                )}
            </div>

            {/* Fecha de fin (opcional) */}
            <div>
                <label
                    htmlFor="endDate"
                    className="block text-caption font-medium text-gray-700 mb-1"
                >
                    Fecha de fin (opcional)
                </label>
                <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => handleFieldChange('endDate', e.target.value)}
                    aria-describedby={errors.endDate ? 'endDate-error' : undefined}
                    disabled={isSubmitting}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('endDate')}`}
                />
                {errors.endDate && (
                    <p
                        id="endDate-error"
                        aria-live="polite"
                        className="mt-1 text-[14px] text-red-600"
                    >
                        {errors.endDate}
                    </p>
                )}
            </div>

            {/* Submit button */}
            <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !!successMessage}
                aria-busy={isSubmitting}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
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
                        Creando arriendo...
                    </span>
                ) : (
                    'Crear arriendo'
                )}
            </Button>
        </form>
    );
}
