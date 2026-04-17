'use client';

import type { RegistrationFormData } from '../types';

interface Step3CredentialsProps {
  data: RegistrationFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function Step3Credentials({
  data,
  errors,
  onChange,
}: Step3CredentialsProps) {
  return (
    <div className="flex flex-col gap-section-gap">
      {/* Email field */}
      <div className="flex flex-col gap-element-gap">
        <label htmlFor="step3-mail" className="text-body font-medium text-neutral-900">
          Correo electrónico
        </label>
        <input
          id="step3-mail"
          type="email"
          value={data.mail}
          onChange={(e) => onChange('mail', e.target.value)}
          aria-describedby={errors.mail ? 'step3-mail-error' : undefined}
          aria-invalid={!!errors.mail}
          className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
            errors.mail ? 'border-red-500' : 'border-neutral-300'
          }`}
          autoComplete="email"
        />
        <div aria-live="polite">
          {errors.mail && (
            <p id="step3-mail-error" className="text-sm text-red-600">
              {errors.mail}
            </p>
          )}
        </div>
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-element-gap">
        <label htmlFor="step3-password" className="text-body font-medium text-neutral-900">
          Contraseña
        </label>
        <input
          id="step3-password"
          type="password"
          value={data.password}
          onChange={(e) => onChange('password', e.target.value)}
          aria-describedby={errors.password ? 'step3-password-error' : undefined}
          aria-invalid={!!errors.password}
          className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
            errors.password ? 'border-red-500' : 'border-neutral-300'
          }`}
          autoComplete="new-password"
        />
        <div aria-live="polite">
          {errors.password && (
            <p id="step3-password-error" className="text-sm text-red-600">
              {errors.password}
            </p>
          )}
        </div>
      </div>

      {/* Confirm password field */}
      <div className="flex flex-col gap-element-gap">
        <label htmlFor="step3-confirmPassword" className="text-body font-medium text-neutral-900">
          Confirmar contraseña
        </label>
        <input
          id="step3-confirmPassword"
          type="password"
          value={data.confirmPassword}
          onChange={(e) => onChange('confirmPassword', e.target.value)}
          aria-describedby={errors.confirmPassword ? 'step3-confirmPassword-error' : undefined}
          aria-invalid={!!errors.confirmPassword}
          className={`h-[48px] min-h-[44px] w-full rounded-radius-card border px-4 text-body text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary ${
            errors.confirmPassword ? 'border-red-500' : 'border-neutral-300'
          }`}
          autoComplete="new-password"
        />
        <div aria-live="polite">
          {errors.confirmPassword && (
            <p id="step3-confirmPassword-error" className="text-sm text-red-600">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
