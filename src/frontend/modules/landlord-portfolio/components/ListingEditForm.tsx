'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@modules/users/context/AuthContext';
import { fetchListingByUnit, updateListing } from '@/shared/services/api';
import { Header } from '@/shared/components/Header';
import type { ListingResponse } from '@modules/property-listings/types';

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

interface ListingEditFormProps {
    portfolioId: string;
    unitId: string;
}

interface ExistingPhoto {
    id: string;
    fileUrl: string;
}

interface NewPhoto {
    file: File;
    previewUrl: string;
}

export default function ListingEditForm({ portfolioId, unitId }: ListingEditFormProps) {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [listing, setListing] = useState<ListingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
    const [removePhotoIds, setRemovePhotoIds] = useState<string[]>([]);
    const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const managePath = `/mi-portafolio/${portfolioId}/unidades/${unitId}/publicacion`;

    const totalPhotos = existingPhotos.length - removePhotoIds.length + newPhotos.length;

    const fetchListing = useCallback(async () => {
        const token = user?.accessToken;
        if (!token) return;

        setIsLoading(true);
        setLoadError(null);

        try {
            const data = await fetchListingByUnit(unitId, token);
            setListing(data);
            setTitle(data.title);
            setDescription(data.description ?? '');
            setPrice(String(data.price));
            setExistingPhotos(data.photos.map((p) => ({ id: p.id, fileUrl: p.fileUrl })));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            if (message === 'Sesión expirada') {
                logout();
                return;
            }
            setLoadError(message);
        } finally {
            setIsLoading(false);
        }
    }, [unitId, user?.accessToken, logout]);

    useEffect(() => {
        fetchListing();
    }, [fetchListing]);

    const clearFieldError = (field: string) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const stripped = stripCOP(e.target.value);
        setPrice(stripped);
        clearFieldError('price');
    };

    const handleRemoveExistingPhoto = (photoId: string) => {
        setRemovePhotoIds((prev) => [...prev, photoId]);
    };

    const handleUndoRemovePhoto = (photoId: string) => {
        setRemovePhotoIds((prev) => prev.filter((id) => id !== photoId));
    };

    const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const available = 10 - totalPhotos;
        const toAdd = Array.from(files).slice(0, available);

        const added: NewPhoto[] = toAdd.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
        }));

        setNewPhotos((prev) => [...prev, ...added]);
        clearFieldError('photos');
        e.target.value = '';
    };

    const handleRemoveNewPhoto = (index: number) => {
        setNewPhotos((prev) => {
            const removed = prev[index];
            if (removed) URL.revokeObjectURL(removed.previewUrl);
            return prev.filter((_, i) => i !== index);
        });
    };

    const validate = (): Record<string, string> => {
        const errs: Record<string, string> = {};
        if (!title.trim()) errs.title = 'El título es obligatorio';
        const numericPrice = Number(price);
        if (!price || isNaN(numericPrice) || numericPrice <= 0) {
            errs.price = 'El precio debe ser mayor a 0';
        }
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError(null);

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        const token = user?.accessToken;
        if (!token || !listing) {
            logout();
            return;
        }

        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('description', description.trim());
            formData.append('price', price);

            removePhotoIds.forEach((id) => {
                formData.append('removePhotoIds', id);
            });

            newPhotos.forEach((photo) => {
                formData.append('photos', photo.file);
            });

            await updateListing(listing.id, formData, token);
            router.push(managePath);
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
            ? 'border-red-600 focus-visible:ring-red-600'
            : 'border-gray-300 focus-visible:ring-primary';

    const backButton = (
        <Link
            href={managePath}
            aria-label="Volver a gestionar publicación"
            className="flex items-center justify-center w-[44px] h-[44px] rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
            </svg>
        </Link>
    );

    return (
        <>
            <Header
                title="Editar publicación"
                onMenuClick={() => { }}
                leftAction={backButton}
            />

            <main className="flex justify-center px-mobile-margin md:px-desktop-margin py-section-gap">
                <div className="w-full max-w-[560px]">
                    {isLoading && (
                        <div className="flex items-center justify-center py-section-gap" aria-busy="true" aria-live="polite">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary" role="status">
                                <span className="sr-only">Cargando publicación...</span>
                            </div>
                        </div>
                    )}

                    {!isLoading && loadError && (
                        <div role="alert" className="text-center py-section-gap">
                            <p className="text-h3 font-medium text-neutral-900">No pudimos cargar la información.</p>
                            <p className="text-body text-neutral-600 mt-2">Intenta de nuevo.</p>
                            <button
                                onClick={fetchListing}
                                className="mt-4 bg-primary text-white rounded-card h-[56px] px-6 min-w-[44px] min-h-[44px] text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!isLoading && !loadError && listing && (
                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                            {serverError && (
                                <div
                                    role="alert"
                                    className="rounded-md bg-red-50 border border-red-200 p-3 text-caption text-red-700"
                                >
                                    {serverError}
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label
                                    htmlFor="editTitle"
                                    className="block text-caption font-medium text-gray-700 mb-1"
                                >
                                    Título de la publicación <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="editTitle"
                                    type="text"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        clearFieldError('title');
                                    }}
                                    placeholder="Ej: Apartamento amplio con vista al parque"
                                    aria-describedby={errors.title ? 'editTitle-error' : undefined}
                                    aria-invalid={!!errors.title}
                                    disabled={isSubmitting}
                                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus-visible:ring-2 transition-colors ${fieldBorderClass('title')}`}
                                />
                                {errors.title && (
                                    <p id="editTitle-error" aria-live="polite" className="mt-1 text-[14px] text-red-600">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label
                                    htmlFor="editDescription"
                                    className="block text-caption font-medium text-gray-700 mb-1"
                                >
                                    Descripción
                                </label>
                                <textarea
                                    id="editDescription"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe las características principales del inmueble..."
                                    disabled={isSubmitting}
                                    rows={4}
                                    className="w-full min-h-[44px] rounded-[10px] border border-gray-300 px-3 py-2 text-body focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors resize-none"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label
                                    htmlFor="editPrice"
                                    className="block text-caption font-medium text-gray-700 mb-1"
                                >
                                    Canon de arrendamiento mensual <span className="text-red-600">*</span>
                                </label>
                                <input
                                    id="editPrice"
                                    type="text"
                                    inputMode="numeric"
                                    value={formatCOP(price)}
                                    onChange={handlePriceChange}
                                    placeholder="$0"
                                    aria-describedby={errors.price ? 'editPrice-error' : undefined}
                                    aria-invalid={!!errors.price}
                                    disabled={isSubmitting}
                                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus-visible:ring-2 transition-colors ${fieldBorderClass('price')}`}
                                />
                                {errors.price && (
                                    <p id="editPrice-error" aria-live="polite" className="mt-1 text-[14px] text-red-600">
                                        {errors.price}
                                    </p>
                                )}
                            </div>

                            {/* Photo management */}
                            <div>
                                <p className="block text-caption font-medium text-gray-700 mb-1">
                                    Fotos ({totalPhotos}/10)
                                </p>

                                {/* Existing photos */}
                                {existingPhotos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {existingPhotos.map((photo) => {
                                            const isMarkedForRemoval = removePhotoIds.includes(photo.id);
                                            return (
                                                <div key={photo.id} className="relative aspect-square rounded-[8px] overflow-hidden">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={photo.fileUrl}
                                                        alt="Foto existente"
                                                        className={`w-full h-full object-cover ${isMarkedForRemoval ? 'opacity-40' : ''}`}
                                                        loading="lazy"
                                                    />
                                                    {isMarkedForRemoval ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUndoRemovePhoto(photo.id)}
                                                            aria-label="Restaurar foto"
                                                            className="absolute inset-0 flex items-center justify-center min-h-[44px] min-w-[44px] bg-black/30 text-white text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        >
                                                            Restaurar
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveExistingPhoto(photo.id)}
                                                            aria-label="Eliminar foto"
                                                            disabled={isSubmitting}
                                                            className="absolute top-1 right-1 flex items-center justify-center w-[32px] h-[32px] min-h-[44px] min-w-[44px] p-0 rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* New photos preview */}
                                {newPhotos.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {newPhotos.map((photo, index) => (
                                            <div key={photo.previewUrl} className="relative aspect-square rounded-[8px] overflow-hidden border-2 border-dashed border-primary/40">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={photo.previewUrl}
                                                    alt={`Nueva foto ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveNewPhoto(index)}
                                                    aria-label={`Eliminar nueva foto ${index + 1}`}
                                                    disabled={isSubmitting}
                                                    className="absolute top-1 right-1 flex items-center justify-center w-[32px] h-[32px] min-h-[44px] min-w-[44px] p-0 rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add photos button */}
                                {totalPhotos < 10 && (
                                    <label
                                        className="flex items-center justify-center w-full min-h-[44px] rounded-[10px] border-2 border-dashed border-gray-300 text-body text-gray-500 cursor-pointer hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-primary transition-colors"
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleAddPhotos}
                                            disabled={isSubmitting}
                                            className="sr-only"
                                            aria-label="Agregar fotos"
                                        />
                                        <span className="py-3">+ Agregar fotos</span>
                                    </label>
                                )}

                                {errors.photos && (
                                    <p aria-live="polite" className="mt-1 text-[14px] text-red-600">
                                        {errors.photos}
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                aria-busy={isSubmitting}
                                className="flex items-center justify-center w-full min-h-[56px] rounded-[10px] text-body font-medium bg-primary text-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-primary-600 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
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
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Guardando...
                                    </span>
                                ) : (
                                    'Guardar cambios'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </>
    );
}
