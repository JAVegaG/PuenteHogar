'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RegistrationFormData, DocumentType, RegisterRequest } from '../types';
import { validateStep1, validateStep2, validateStep3 } from '../validation';
import { authService } from '@/shared/services/auth';
import { Button } from '@/shared/components/Button';
import StepIndicator from './StepIndicator';
import Step1UserType from './Step1UserType';
import Step2PersonalData from './Step2PersonalData';
import Step3Credentials from './Step3Credentials';

const initialFormData: RegistrationFormData = {
  userType: '',
  personType: '',
  firstName: '',
  lastName: '',
  preferredName: '',
  businessName: '',
  documentTypeCode: '',
  documentNumber: '',
  phoneNumber: '',
  mail: '',
  password: '',
  confirmPassword: '',
};

export default function RegistrationWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authService.getDocumentTypes().then((types) => {
      if (!cancelled) {
        setDocumentTypes(types);
        setIsLoadingDocumentTypes(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoadingDocumentTypes(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      router.push('/auth/login');
    } else {
      setCurrentStep((prev) => (prev - 1) as 1 | 2);
      setErrors({});
      setServerError(null);
    }
  }, [currentStep, router]);

  const handleContinue = useCallback(() => {
    const stepErrors =
      currentStep === 1 ? validateStep1(formData) : validateStep2(formData);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setCurrentStep((prev) => (prev + 1) as 2 | 3);
  }, [currentStep, formData]);

  const buildPayload = useCallback((): RegisterRequest => {
    const userType = formData.userType as 'LANDLORD' | 'TENANT';
    const personType = formData.personType as 'natural' | 'legal';

    const fullName =
      personType === 'natural'
        ? `${formData.firstName} ${formData.lastName}`
        : formData.businessName;

    const payload: RegisterRequest = {
      fullName,
      userType,
      role: userType,
      personType,
      documentTypeCode: formData.documentTypeCode,
      documentNumber: formData.documentNumber,
      mail: formData.mail.trim(),
      phoneNumber: formData.phoneNumber,
      password: formData.password,
    };

    if (personType === 'natural') {
      payload.naturalDetails = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        ...(formData.preferredName.trim()
          ? { preferredName: formData.preferredName.trim() }
          : {}),
      };
    } else {
      payload.legalDetails = { businessName: formData.businessName };
    }

    return payload;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    const stepErrors = validateStep3(formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      await authService.register(buildPayload());
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo completar el registro. Intenta de nuevo más tarde.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, buildPayload, router]);

  if (success) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-12"
        role="status"
        aria-live="polite"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-8 w-8 text-green-600"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-green-700">
          ¡Cuenta creada exitosamente!
        </p>
        <p className="text-sm text-neutral-600">
          Redirigiendo al inicio de sesión…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-section-gap">
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      {/* Server error banner */}
      {serverError && (
        <div
          className="rounded-radius-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {serverError}
        </div>
      )}

      {/* Step content */}
      {currentStep === 1 && (
        <Step1UserType data={formData} errors={errors} onChange={handleChange} />
      )}
      {currentStep === 2 && (
        <Step2PersonalData
          data={formData}
          errors={errors}
          onChange={handleChange}
          documentTypes={documentTypes}
          isLoadingDocumentTypes={isLoadingDocumentTypes}
        />
      )}
      {currentStep === 3 && (
        <Step3Credentials data={formData} errors={errors} onChange={handleChange} />
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        {currentStep < 3 ? (
          <Button variant="primary" onClick={handleContinue}>
            Continuar
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Creando cuenta…
              </span>
            ) : (
              'Crear cuenta'
            )}
          </Button>
        )}
        <Button variant="secondary" onClick={handleBack}>
          {currentStep === 1 ? 'Volver al inicio de sesión' : 'Atrás'}
        </Button>
      </div>
    </div>
  );
}
