'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateLoginForm } from '../validation';
import { authService } from '@/shared/services/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginForm() {
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  function handleMailChange(value: string) {
    setMail(value);
    if (errors.mail) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.mail;
        return next;
      });
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateLoginForm(mail, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.login({ mail, password });
      login(response.accessToken, response.userId, response.roles);
      router.push('/explorar');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Credenciales inválidas') {
        setServerError('Correo electrónico o contraseña incorrectos');
      } else {
        setServerError(
          'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputBase =
    'h-[50px] min-h-[44px] w-full rounded-[6px] border bg-[#f9fafb] px-4 text-[16px] text-neutral-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Server error */}
      <div aria-live="polite" role="alert">
        {serverError && (
          <div className="rounded-[6px] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="login-mail" className="text-[14px] leading-[20px] text-[#111827]">
          Correo electrónico
        </label>
        <input
          id="login-mail"
          type="email"
          value={mail}
          onChange={(e) => handleMailChange(e.target.value)}
          placeholder="ejemplo@correo.com"
          aria-describedby={errors.mail ? 'login-mail-error' : undefined}
          aria-invalid={!!errors.mail}
          className={`${inputBase} ${errors.mail ? 'border-red-500' : 'border-[#d1d5db]'}`}
          autoComplete="email"
        />
        <div aria-live="polite">
          {errors.mail && (
            <p id="login-mail-error" className="text-sm text-red-600">
              {errors.mail}
            </p>
          )}
        </div>
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="text-[14px] leading-[20px] text-[#111827]">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder="Ingrese su contraseña"
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          aria-invalid={!!errors.password}
          className={`${inputBase} ${errors.password ? 'border-red-500' : 'border-[#d1d5db]'}`}
          autoComplete="current-password"
        />
        <div aria-live="polite">
          {errors.password && (
            <p id="login-password-error" className="text-sm text-red-600">
              {errors.password}
            </p>
          )}
        </div>
      </div>

      {/* Forgot password link */}
      <div className="flex justify-end">
        <span className="text-[14px] text-[#1d4ed8] cursor-default">
          ¿Olvidaste tu contraseña?
        </span>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="h-[56px] w-full rounded-[6px] bg-[#1d4ed8] text-[16px] text-white text-center transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            Iniciando sesión…
          </span>
        ) : (
          'Iniciar sesión'
        )}
      </button>

      {/* Register link */}
      <p className="text-center text-[16px] text-[#4b5563]">
        ¿No tienes cuenta?{' '}
        <Link href="/auth/registro" className="inline-flex items-center min-h-[44px] text-[#1d4ed8] hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
