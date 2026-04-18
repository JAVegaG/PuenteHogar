'use client';

import { useState } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { validateEnrichedUnitForm } from '../validation';
import { portfolioService } from '@/shared/services/portfolio';
import type { EnrichedUnitFormData, CreateUnitRequest } from '../types';
import { Button } from '@/shared/components/Button';

interface AddUnitFormProps {
  portfolioId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const initialFormData: EnrichedUnitFormData = {
  name: '',
  address: '',
  propertyType: '',
  length: '',
  width: '',
  numberOfRooms: '0',
  numberOfBathrooms: '0',
  description: '',
  leaseBaseAmount: '',
  leaseBaseCurrency: 'COP',
};

export function AddUnitForm({ portfolioId, onSuccess, onCancel }: AddUnitFormProps) {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState<EnrichedUnitFormData>({ ...initialFormData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof EnrichedUnitFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const computedArea = (): string | null => {
    const l = parseFloat(formData.length);
    const w = parseFloat(formData.width);
    if (Number.isFinite(l) && l > 0 && Number.isFinite(w) && w > 0) {
      return (l * w).toFixed(2);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateEnrichedUnitForm(formData);
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
      const request: CreateUnitRequest = {
        name: formData.name,
        address: formData.address,
        propertyType: formData.propertyType,
        length: formData.length ? parseFloat(formData.length) : undefined,
        width: formData.width ? parseFloat(formData.width) : undefined,
        numberOfRooms: formData.numberOfRooms ? parseInt(formData.numberOfRooms, 10) : undefined,
        numberOfBathrooms: formData.numberOfBathrooms ? parseInt(formData.numberOfBathrooms, 10) : undefined,
        description: formData.description || undefined,
        leaseBaseAmount: parseFloat(formData.leaseBaseAmount),
        leaseBaseCurrency: formData.leaseBaseCurrency,
      };

      await portfolioService.createEnrichedUnit(portfolioId, request, token);
      onSuccess();
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

  const area = computedArea();

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Sección: Información básica */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información básica</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre / Identificación
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Apartamento 301, Casa 5, Local 102"
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('name')}`}
            />
            {errors.name && (
              <p
                id="name-error"
                aria-live="polite"
                className="mt-1 text-[14px] text-red-600"
              >
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dirección
            </label>
            <input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ej: Carrera 7 #58-32"
              aria-describedby={errors.address ? 'address-error' : undefined}
              className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('address')}`}
            />
            {errors.address && (
              <p
                id="address-error"
                aria-live="polite"
                className="mt-1 text-[14px] text-red-600"
              >
                {errors.address}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="propertyType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tipo de propiedad
            </label>
            <input
              id="propertyType"
              type="text"
              value={formData.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
              placeholder="Ej: Apartamento, Casa, Local"
              aria-describedby={errors.propertyType ? 'propertyType-error' : undefined}
              className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('propertyType')}`}
            />
            {errors.propertyType && (
              <p
                id="propertyType-error"
                aria-live="polite"
                className="mt-1 text-[14px] text-red-600"
              >
                {errors.propertyType}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Sección: Detalles de la propiedad */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles de la propiedad</h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="length"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Largo (m)
              </label>
              <input
                id="length"
                type="text"
                inputMode="decimal"
                value={formData.length}
                onChange={(e) => handleChange('length', e.target.value)}
                placeholder="Largo (m)"
                aria-describedby={errors.length ? 'length-error' : undefined}
                className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('length')}`}
              />
              {errors.length && (
                <p
                  id="length-error"
                  aria-live="polite"
                  className="mt-1 text-[14px] text-red-600"
                >
                  {errors.length}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="width"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ancho (m)
              </label>
              <input
                id="width"
                type="text"
                inputMode="decimal"
                value={formData.width}
                onChange={(e) => handleChange('width', e.target.value)}
                placeholder="Ancho (m)"
                aria-describedby={errors.width ? 'width-error' : undefined}
                className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('width')}`}
              />
              {errors.width && (
                <p
                  id="width-error"
                  aria-live="polite"
                  className="mt-1 text-[14px] text-red-600"
                >
                  {errors.width}
                </p>
              )}
            </div>
          </div>

          {area && (
            <div className="rounded-[10px] bg-gray-50 border border-gray-200 px-3 py-3 text-sm text-gray-700">
              Área calculada: <span className="font-medium">{area} m²</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="numberOfRooms"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Habitaciones
              </label>
              <input
                id="numberOfRooms"
                type="text"
                inputMode="numeric"
                value={formData.numberOfRooms}
                onChange={(e) => handleChange('numberOfRooms', e.target.value)}
                placeholder="0"
                aria-describedby={errors.numberOfRooms ? 'numberOfRooms-error' : undefined}
                className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('numberOfRooms')}`}
              />
              {errors.numberOfRooms && (
                <p
                  id="numberOfRooms-error"
                  aria-live="polite"
                  className="mt-1 text-[14px] text-red-600"
                >
                  {errors.numberOfRooms}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="numberOfBathrooms"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Baños
              </label>
              <input
                id="numberOfBathrooms"
                type="text"
                inputMode="numeric"
                value={formData.numberOfBathrooms}
                onChange={(e) => handleChange('numberOfBathrooms', e.target.value)}
                placeholder="0"
                aria-describedby={errors.numberOfBathrooms ? 'numberOfBathrooms-error' : undefined}
                className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('numberOfBathrooms')}`}
              />
              {errors.numberOfBathrooms && (
                <p
                  id="numberOfBathrooms-error"
                  aria-live="polite"
                  className="mt-1 text-[14px] text-red-600"
                >
                  {errors.numberOfBathrooms}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Descripción adicional (opcional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full min-h-[44px] rounded-[10px] border border-gray-300 px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Sección: Datos de arriendo */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de arriendo</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="leaseBaseAmount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Canon base de arrendamiento
            </label>
            <input
              id="leaseBaseAmount"
              type="text"
              inputMode="decimal"
              value={formData.leaseBaseAmount}
              onChange={(e) => handleChange('leaseBaseAmount', e.target.value)}
              placeholder="Ej: 1200000"
              aria-describedby={errors.leaseBaseAmount ? 'leaseBaseAmount-error' : undefined}
              className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('leaseBaseAmount')}`}
            />
            {errors.leaseBaseAmount && (
              <p
                id="leaseBaseAmount-error"
                aria-live="polite"
                className="mt-1 text-[14px] text-red-600"
              >
                {errors.leaseBaseAmount}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="leaseBaseCurrency"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Moneda
            </label>
            <input
              id="leaseBaseCurrency"
              type="text"
              value={formData.leaseBaseCurrency}
              onChange={(e) => handleChange('leaseBaseCurrency', e.target.value)}
              placeholder="COP"
              aria-describedby={errors.leaseBaseCurrency ? 'leaseBaseCurrency-error' : undefined}
              className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('leaseBaseCurrency')}`}
            />
            {errors.leaseBaseCurrency && (
              <p
                id="leaseBaseCurrency-error"
                aria-live="polite"
                className="mt-1 text-[14px] text-red-600"
              >
                {errors.leaseBaseCurrency}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Botones */}
      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
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
              Guardando...
            </span>
          ) : (
            'Agregar unidad'
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
