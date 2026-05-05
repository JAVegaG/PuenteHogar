'use client';

import { useState } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { contractService } from '@/shared/services/contract';
import { validateContractStep1, validateContractStep2, validateContractStep3 } from '../validation';
import type { ContractFormData } from '../types';
import type { LeaseDetail } from '@modules/landlord-leases/types';
import { WizardProgress } from '@/shared/components/WizardProgress';
import { StepTenant } from './StepTenant';
import { StepTerms } from './StepTerms';
import { StepDocument } from './StepDocument';
import { Button } from '@/shared/components/Button';

const WIZARD_STEPS = ['Arrendatario', 'Términos', 'Documento'];

interface ContractWizardProps {
    lease: LeaseDetail;
    onSuccess: (contractId: string) => void;
}

function parseFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
}

export function ContractWizard({ lease, onSuccess }: ContractWizardProps) {
    const { user, logout } = useAuth();
    const { firstName, lastName } = parseFullName(lease.tenant.fullName);

    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [formData, setFormData] = useState<ContractFormData>({
        firstName,
        lastName,
        documentTypeCode: lease.tenant.documentTypeCode,
        documentNumber: lease.tenant.documentNumber,
        email: lease.tenant.email,
        phoneNumber: lease.tenant.phoneNumber,
        startDate: lease.startDate ? lease.startDate.split('T')[0] : '',
        endDate: '',
        monthlyRent: String(lease.monthlyAmount || ''),
        file: null,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFieldChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleFileSelect = (file: File) => {
        setFormData((prev) => ({ ...prev, file }));
        setErrors((prev) => {
            if (!prev.file) return prev;
            const next = { ...prev };
            delete next.file;
            return next;
        });
    };

    const handleNext = () => {
        setServerError(null);
        let validationErrors: Record<string, string> = {};

        if (currentStep === 1) {
            validationErrors = validateContractStep1(formData);
        } else if (currentStep === 2) {
            validationErrors = validateContractStep2(formData);
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        if (currentStep === 1) setCurrentStep(2);
        else if (currentStep === 2) setCurrentStep(3);
    };

    const handleBack = () => {
        setServerError(null);
        setErrors({});
        if (currentStep === 2) setCurrentStep(1);
        else if (currentStep === 3) setCurrentStep(2);
    };

    const handleSubmit = async () => {
        setServerError(null);

        const validationErrors = validateContractStep3(formData);
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
            if (!formData.file) {
                setErrors({ file: 'Debes seleccionar un archivo PDF' });
                setIsSubmitting(false);
                return;
            }

            const created = await contractService.createContract(
                {
                    file: formData.file,
                    leaseId: lease.id,
                    startDate: formData.startDate,
                    endDate: formData.endDate || undefined,
                },
                token
            );

            setSuccessMessage('¡Contrato creado exitosamente!');
            setTimeout(() => {
                onSuccess(created.id);
            }, 1500);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error inesperado';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            if (message.includes('almacenamiento') || message.includes('Error del servidor')) {
                setServerError('Problema temporal de almacenamiento. Intenta de nuevo más tarde.');
            } else {
                setServerError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <WizardProgress currentStep={currentStep} steps={WIZARD_STEPS} />

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

            {/* Step content */}
            {currentStep === 1 && (
                <StepTenant data={formData} errors={errors} onChange={handleFieldChange} />
            )}
            {currentStep === 2 && (
                <StepTerms data={formData} errors={errors} onChange={handleFieldChange} />
            )}
            {currentStep === 3 && (
                <StepDocument data={formData} errors={errors} onFileSelect={handleFileSelect} />
            )}

            {/* Navigation buttons */}
            <div className="flex flex-col gap-3 mt-2">
                {currentStep < 3 && (
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleNext}
                        disabled={!!successMessage}
                    >
                        {currentStep === 1
                            ? 'Continuar a términos del contrato'
                            : 'Continuar a documento'}
                    </Button>
                )}

                {currentStep === 3 && (
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
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
                                Subiendo contrato...
                            </span>
                        ) : (
                            'Crear contrato'
                        )}
                    </Button>
                )}

                {currentStep > 1 && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleBack}
                        disabled={isSubmitting || !!successMessage}
                    >
                        Volver al paso anterior
                    </Button>
                )}
            </div>
        </div>
    );
}
