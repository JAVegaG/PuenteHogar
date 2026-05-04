'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@modules/users/context/AuthContext';
import { createListing, fetchAdditionalFeatures } from '@/shared/services/api';
import { validatePublishForm } from '../validation';
import { PhotoUploader } from './PhotoUploader';
import { Button } from '@/shared/components/Button';
import type { PhotoFile } from '../types';
import type { UnitInfo } from '@modules/landlord-leases/types';
import type { AdditionalFeature } from '@modules/property-listings/types';

/** Format a raw numeric string as COP display: "120000" → "$120.000" */
function formatCOP(raw: string): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return '$' + Number(digits).toLocaleString('es-CO');
}

/** Strip formatting back to digits only */
function stripCOP(display: string): string {
    return display.replace(/\D/g, '');
}

interface PublishFormProps {
    unit: UnitInfo;
    onSuccess: () => void;
}

export function PublishForm({ unit, onSuccess }: PublishFormProps) {
    const { user, logout } = useAuth();
    const [photos, setPhotos] = useState<PhotoFile[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [additionalFeatures, setAdditionalFeatures] = useState<AdditionalFeature[]>([]);
    const [featureValues, setFeatureValues] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchAdditionalFeatures()
            .then((features) => setAdditionalFeatures(features))
            .catch(() => {
                // Graceful degradation — show form without additional features
            });
    }, []);

    const clearFieldError = (field: string) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleFeatureChange = (featureId: string, value: string) => {
        setFeatureValues((prev) => ({ ...prev, [featureId]: value }));
        clearFieldError(`feature_${featureId}`);
    };

    const handleAddPhotos = (files: File[]) => {
        const newPhotos: PhotoFile[] = files.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
        }));
        setPhotos((prev) => [...prev, ...newPhotos]);
        clearFieldError('photos');
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos((prev) => {
            const removed = prev[index];
            if (removed) URL.revokeObjectURL(removed.previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const stripped = stripCOP(e.target.value);
        setPrice(stripped);
        clearFieldError('price');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError(null);
        setSuccessMessage(null);

        const validationErrors = validatePublishForm({ photos, title, price });

        // Validate required additional features
        for (const feature of additionalFeatures) {
            if (feature.required) {
                const value = featureValues[feature.id] ?? '';
                if (!value.trim()) {
                    validationErrors[`feature_${feature.id}`] =
                        feature.errorMessage || `${feature.name} es obligatorio`;
                }
            }
        }

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
            const formData = new FormData();
            formData.append('portfolioUnitId', unit.id);
            formData.append('title', title.trim());
            if (description.trim()) {
                formData.append('description', description.trim());
            }
            formData.append('price', price);
            formData.append('currency', 'COP');
            photos.forEach((photo) => {
                formData.append('photos', photo.file);
            });

            // Append additional feature values
            const featurePayload: Record<string, string> = {};
            for (const feature of additionalFeatures) {
                const value = featureValues[feature.id] ?? '';
                if (value.trim()) {
                    featurePayload[feature.id] = value.trim();
                }
            }
            if (Object.keys(featurePayload).length > 0) {
                formData.append('additionalFeatures', JSON.stringify(featurePayload));
            }

            await createListing(formData, token);
            setSuccessMessage('¡Inmueble publicado exitosamente!');
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

            {/* Photos section */}
            <div>
                <label className="block text-body font-semibold text-[#111827] mb-[4px]">
                    Fotos de la unidad <span className="text-red-600">*</span>
                </label>
                <p className="text-caption text-[#4b5563] mb-[8px]">
                    Sube al menos 3 fotos de la propiedad. Las fotos de buena calidad atraen más arrendatarios.
                </p>
                <PhotoUploader
                    photos={photos}
                    onAdd={handleAddPhotos}
                    onRemove={handleRemovePhoto}
                    maxPhotos={10}
                />
                {errors.photos && (
                    <p id="photos-error" aria-live="polite" className="mt-1 text-[14px] text-red-600">
                        {errors.photos}
                    </p>
                )}
            </div>

            {/* Title */}
            <div>
                <label
                    htmlFor="publishTitle"
                    className="block text-caption font-medium text-gray-700 mb-1"
                >
                    Título de la publicación <span className="text-red-600">*</span>
                </label>
                <input
                    id="publishTitle"
                    type="text"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        clearFieldError('title');
                    }}
                    placeholder="Ej: Apartamento amplio con vista al parque"
                    aria-describedby={errors.title ? 'publishTitle-error' : undefined}
                    disabled={isSubmitting}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('title')}`}
                />
                {errors.title && (
                    <p
                        id="publishTitle-error"
                        aria-live="polite"
                        className="mt-1 text-[14px] text-red-600"
                    >
                        {errors.title}
                    </p>
                )}
            </div>

            {/* Description */}
            <div>
                <label
                    htmlFor="publishDescription"
                    className="block text-caption font-medium text-gray-700 mb-1"
                >
                    Descripción
                </label>
                <textarea
                    id="publishDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe las características principales del inmueble..."
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full rounded-[10px] border border-gray-300 px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
                />
            </div>

            {/* Price */}
            <div>
                <label
                    htmlFor="publishPrice"
                    className="block text-caption font-medium text-gray-700 mb-1"
                >
                    Canon de arrendamiento mensual <span className="text-red-600">*</span>
                </label>
                <input
                    id="publishPrice"
                    type="text"
                    inputMode="numeric"
                    value={formatCOP(price)}
                    onChange={handlePriceChange}
                    placeholder="$0"
                    aria-describedby={errors.price ? 'publishPrice-error' : undefined}
                    disabled={isSubmitting}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('price')}`}
                />
                {errors.price && (
                    <p
                        id="publishPrice-error"
                        aria-live="polite"
                        className="mt-1 text-[14px] text-red-600"
                    >
                        {errors.price}
                    </p>
                )}
            </div>

            {/* Additional Features */}
            {additionalFeatures.length > 0 && (
                <fieldset className="flex flex-col gap-4">
                    <legend className="text-h3 font-semibold text-[#111827] mb-2">
                        Características adicionales
                    </legend>
                    {additionalFeatures.map((feature) => {
                        const fieldId = `feature_${feature.id}`;
                        const errorKey = `feature_${feature.id}`;
                        const value = featureValues[feature.id] ?? '';

                        if (feature.element === 'checkbox') {
                            return (
                                <div key={feature.id} className="flex items-center gap-2">
                                    <input
                                        id={fieldId}
                                        type="checkbox"
                                        checked={value === 'true'}
                                        onChange={(e) =>
                                            handleFeatureChange(feature.id, e.target.checked ? 'true' : '')
                                        }
                                        disabled={isSubmitting}
                                        className="h-[20px] w-[20px] min-h-[44px] min-w-[44px] accent-[#1d4ed8] cursor-pointer"
                                        aria-describedby={errors[errorKey] ? `${fieldId}-error` : undefined}
                                    />
                                    <label
                                        htmlFor={fieldId}
                                        className="text-caption font-medium text-gray-700 cursor-pointer"
                                    >
                                        {feature.name}
                                        {feature.required && <span className="text-red-600"> *</span>}
                                    </label>
                                    {errors[errorKey] && (
                                        <p
                                            id={`${fieldId}-error`}
                                            aria-live="polite"
                                            className="text-[14px] text-red-600"
                                        >
                                            {errors[errorKey]}
                                        </p>
                                    )}
                                </div>
                            );
                        }

                        if (feature.element === 'dropdown') {
                            return (
                                <div key={feature.id}>
                                    <label
                                        htmlFor={fieldId}
                                        className="block text-caption font-medium text-gray-700 mb-1"
                                    >
                                        {feature.name}
                                        {feature.required && <span className="text-red-600"> *</span>}
                                    </label>
                                    <select
                                        id={fieldId}
                                        value={value}
                                        onChange={(e) => handleFeatureChange(feature.id, e.target.value)}
                                        disabled={isSubmitting}
                                        aria-describedby={errors[errorKey] ? `${fieldId}-error` : undefined}
                                        className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass(errorKey)}`}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Sí">Sí</option>
                                        <option value="No">No</option>
                                    </select>
                                    {errors[errorKey] && (
                                        <p
                                            id={`${fieldId}-error`}
                                            aria-live="polite"
                                            className="mt-1 text-[14px] text-red-600"
                                        >
                                            {errors[errorKey]}
                                        </p>
                                    )}
                                </div>
                            );
                        }

                        if (feature.element === 'number_field') {
                            return (
                                <div key={feature.id}>
                                    <label
                                        htmlFor={fieldId}
                                        className="block text-caption font-medium text-gray-700 mb-1"
                                    >
                                        {feature.name}
                                        {feature.required && <span className="text-red-600"> *</span>}
                                    </label>
                                    <input
                                        id={fieldId}
                                        type="text"
                                        inputMode="numeric"
                                        value={value}
                                        onChange={(e) => handleFeatureChange(feature.id, e.target.value)}
                                        placeholder={feature.description ?? ''}
                                        disabled={isSubmitting}
                                        aria-describedby={errors[errorKey] ? `${fieldId}-error` : undefined}
                                        className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass(errorKey)}`}
                                    />
                                    {errors[errorKey] && (
                                        <p
                                            id={`${fieldId}-error`}
                                            aria-live="polite"
                                            className="mt-1 text-[14px] text-red-600"
                                        >
                                            {errors[errorKey]}
                                        </p>
                                    )}
                                </div>
                            );
                        }

                        // Default: text_field
                        return (
                            <div key={feature.id}>
                                <label
                                    htmlFor={fieldId}
                                    className="block text-caption font-medium text-gray-700 mb-1"
                                >
                                    {feature.name}
                                    {feature.required && <span className="text-red-600"> *</span>}
                                </label>
                                <input
                                    id={fieldId}
                                    type="text"
                                    value={value}
                                    onChange={(e) => handleFeatureChange(feature.id, e.target.value)}
                                    placeholder={feature.description ?? ''}
                                    disabled={isSubmitting}
                                    aria-describedby={errors[errorKey] ? `${fieldId}-error` : undefined}
                                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass(errorKey)}`}
                                />
                                {errors[errorKey] && (
                                    <p
                                        id={`${fieldId}-error`}
                                        aria-live="polite"
                                        className="mt-1 text-[14px] text-red-600"
                                    >
                                        {errors[errorKey]}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </fieldset>
            )}

            {/* Submit */}
            <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !!successMessage}
                aria-busy={isSubmitting}
                className="!min-h-[56px]"
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
                        Publicando...
                    </span>
                ) : (
                    'Publicar inmueble'
                )}
            </Button>
        </form>
    );
}
