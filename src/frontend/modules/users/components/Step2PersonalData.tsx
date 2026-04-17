'use client';

import type { RegistrationFormData, DocumentType } from '../types';
import { Skeleton } from '@/shared/components/Skeleton';

interface Step2PersonalDataProps {
  data: RegistrationFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  documentTypes: DocumentType[];
  isLoadingDocumentTypes?: boolean;
}

export default function Step2PersonalData({
  data,
  errors,
  onChange,
  documentTypes,
  isLoadingDocumentTypes = false,
}: Step2PersonalDataProps) {
  return (
    <div className="flex flex-col gap-section-gap">
      {/* Conditional fields based on personType */}
      {data.personType === 'natural' && (
        <>
          {/* firstName */}
          <div className="flex flex-col gap-element-gap">
            <label htmlFor="step2-firstName" className="text-body font-medium text-neutral-900">
              Nombre
            </label>
            <input
              id="step2-firstName"
              type="text"
              value={data.firstName}
              onChange={(e) => onChange('firstName', e.target.value)}
              aria-describedby={errors.firstName ? 'step2-firstName-error' : undefined}
              aria-invalid={!!errors.firstName}
              className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
                errors.firstName ? 'border-red-500' : 'border-neutral-300'
              }`}
              autoComplete="given-name"
            />
            <div aria-live="polite">
              {errors.firstName && (
                <p id="step2-firstName-error" className="text-[14px] text-red-600">
                  {errors.firstName}
                </p>
              )}
            </div>
          </div>

          {/* lastName */}
          <div className="flex flex-col gap-element-gap">
            <label htmlFor="step2-lastName" className="text-body font-medium text-neutral-900">
              Apellido
            </label>
            <input
              id="step2-lastName"
              type="text"
              value={data.lastName}
              onChange={(e) => onChange('lastName', e.target.value)}
              aria-describedby={errors.lastName ? 'step2-lastName-error' : undefined}
              aria-invalid={!!errors.lastName}
              className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
                errors.lastName ? 'border-red-500' : 'border-neutral-300'
              }`}
              autoComplete="family-name"
            />
            <div aria-live="polite">
              {errors.lastName && (
                <p id="step2-lastName-error" className="text-[14px] text-red-600">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* preferredName (optional) */}
          <div className="flex flex-col gap-element-gap">
            <label htmlFor="step2-preferredName" className="text-body font-medium text-neutral-900">
              Nombre preferido <span className="text-sm font-normal text-neutral-500">(opcional)</span>
            </label>
            <input
              id="step2-preferredName"
              type="text"
              value={data.preferredName}
              onChange={(e) => onChange('preferredName', e.target.value)}
              aria-describedby={errors.preferredName ? 'step2-preferredName-error' : undefined}
              aria-invalid={!!errors.preferredName}
              className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
                errors.preferredName ? 'border-red-500' : 'border-neutral-300'
              }`}
              autoComplete="nickname"
            />
            <div aria-live="polite">
              {errors.preferredName && (
                <p id="step2-preferredName-error" className="text-[14px] text-red-600">
                  {errors.preferredName}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {data.personType === 'legal' && (
        <div className="flex flex-col gap-element-gap">
          <label htmlFor="step2-businessName" className="text-body font-medium text-neutral-900">
            Razón social
          </label>
          <input
            id="step2-businessName"
            type="text"
            value={data.businessName}
            onChange={(e) => onChange('businessName', e.target.value)}
            aria-describedby={errors.businessName ? 'step2-businessName-error' : undefined}
            aria-invalid={!!errors.businessName}
            className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
              errors.businessName ? 'border-red-500' : 'border-neutral-300'
            }`}
            autoComplete="organization"
          />
          <div aria-live="polite">
            {errors.businessName && (
              <p id="step2-businessName-error" className="text-[14px] text-red-600">
                {errors.businessName}
              </p>
            )}
          </div>
        </div>
      )}


      {/* Document type dropdown */}
      <div className="flex flex-col gap-element-gap">
        <label htmlFor="step2-documentTypeCode" className="text-body font-medium text-neutral-900">
          Tipo de documento
        </label>
        {isLoadingDocumentTypes ? (
          <div role="status" aria-busy="true" aria-label="Cargando tipos de documento">
            <Skeleton className="h-[48px] w-full rounded-radius-card" />
          </div>
        ) : (
          <select
            id="step2-documentTypeCode"
            value={data.documentTypeCode}
            onChange={(e) => onChange('documentTypeCode', e.target.value)}
            aria-describedby={errors.documentTypeCode ? 'step2-documentTypeCode-error' : undefined}
            aria-invalid={!!errors.documentTypeCode}
            className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
              errors.documentTypeCode ? 'border-red-500' : 'border-neutral-300'
            }`}
          >
            <option value="">Selecciona un tipo de documento</option>
            {documentTypes.map((dt) => (
              <option key={dt.code} value={dt.code}>
                {dt.description}
              </option>
            ))}
          </select>
        )}
        <div aria-live="polite">
          {errors.documentTypeCode && (
            <p id="step2-documentTypeCode-error" className="text-[14px] text-red-600">
              {errors.documentTypeCode}
            </p>
          )}
        </div>
      </div>

      {/* Document number */}
      <div className="flex flex-col gap-element-gap">
        <label htmlFor="step2-documentNumber" className="text-body font-medium text-neutral-900">
          Número de documento
        </label>
        <input
          id="step2-documentNumber"
          type="text"
          value={data.documentNumber}
          onChange={(e) => onChange('documentNumber', e.target.value)}
          aria-describedby={errors.documentNumber ? 'step2-documentNumber-error' : undefined}
          aria-invalid={!!errors.documentNumber}
          className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
            errors.documentNumber ? 'border-red-500' : 'border-neutral-300'
          }`}
          autoComplete="off"
        />
        <div aria-live="polite">
          {errors.documentNumber && (
            <p id="step2-documentNumber-error" className="text-[14px] text-red-600">
              {errors.documentNumber}
            </p>
          )}
        </div>
      </div>

      {/* Phone number */}
      <div className="flex flex-col gap-element-gap">
        <label htmlFor="step2-phoneNumber" className="text-body font-medium text-neutral-900">
          Número de teléfono
        </label>
        <input
          id="step2-phoneNumber"
          type="tel"
          value={data.phoneNumber}
          onChange={(e) => onChange('phoneNumber', e.target.value)}
          aria-describedby={errors.phoneNumber ? 'step2-phoneNumber-error' : undefined}
          aria-invalid={!!errors.phoneNumber}
          className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
            errors.phoneNumber ? 'border-red-500' : 'border-neutral-300'
          }`}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
        />
        <div aria-live="polite">
          {errors.phoneNumber && (
            <p id="step2-phoneNumber-error" className="text-[14px] text-red-600">
              {errors.phoneNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}