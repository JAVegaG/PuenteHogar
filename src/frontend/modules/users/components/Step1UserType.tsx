'use client';

import type { RegistrationFormData } from '../types';

interface Step1UserTypeProps {
  data: RegistrationFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

const userTypeOptions = [
  {
    value: 'LANDLORD' as const,
    title: 'Arrendador',
    description: 'Quiero publicar inmuebles en arriendo',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <rect x="3" y="10" width="18" height="12" rx="1" />
        <path d="M3 10L12 3l9 7" />
        <rect x="9" y="15" width="6" height="7" />
        <rect x="5" y="13" width="3" height="3" />
        <rect x="16" y="13" width="3" height="3" />
      </svg>
    ),
  },
  {
    value: 'TENANT' as const,
    title: 'Arrendatario',
    description: 'Busco un inmueble en arriendo',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <circle cx="11" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.2-6 5-6s5 2.7 5 6" />
        <circle cx="18" cy="13" r="3" />
        <path d="M18 16l3 3" />
      </svg>
    ),
  },
];

const personTypeOptions = [
  { value: 'natural' as const, label: 'Persona natural' },
  { value: 'legal' as const, label: 'Persona jurídica' },
];

export default function Step1UserType({ data, errors, onChange }: Step1UserTypeProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* User type selection */}
      <fieldset>
        <legend className="mb-3 text-body font-medium text-neutral-900">
          ¿Qué tipo de usuario eres?
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de usuario">
          {userTypeOptions.map((option) => {
            const isSelected = data.userType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${option.title}: ${option.description}`}
                onClick={() => onChange('userType', option.value)}
                className={`flex min-h-[44px] cursor-pointer flex-col items-center gap-2 rounded-radius-card border-2 p-5 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                }`}
              >
                <span className={isSelected ? 'text-primary' : 'text-neutral-500'}>
                  {option.icon}
                </span>
                <span className="text-body font-semibold">{option.title}</span>
                <span className="text-sm text-neutral-500">{option.description}</span>
              </button>
            );
          })}
        </div>
        <div aria-live="polite">
          {errors.userType && (
            <p className="mt-2 text-[14px] text-red-600" role="alert">
              {errors.userType}
            </p>
          )}
        </div>
      </fieldset>

      {/* Person type selection */}
      <fieldset>
        <legend className="mb-3 text-body font-medium text-neutral-900">
          Tipo de persona
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4" role="radiogroup" aria-label="Tipo de persona">
          {personTypeOptions.map((option) => {
            const isSelected = data.personType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                onClick={() => onChange('personType', option.value)}
                className={`flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-2 rounded-radius-card border-2 px-4 py-3 text-body font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full border-2 ${
                    isSelected ? 'border-primary bg-primary' : 'border-neutral-400 bg-white'
                  }`}
                  aria-hidden="true"
                />
                {option.label}
              </button>
            );
          })}
        </div>
        <div aria-live="polite">
          {errors.personType && (
            <p className="mt-2 text-[14px] text-red-600" role="alert">
              {errors.personType}
            </p>
          )}
        </div>
      </fieldset>
    </div>
  );
}
