'use client';

import { useRef } from 'react';
import type { PhotoFile } from '../types';
import { PhotoThumbnail } from './PhotoThumbnail';

interface PhotoUploaderProps {
    photos: PhotoFile[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
    maxPhotos?: number;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoUploader({ photos, onAdd, onRemove, maxPhotos = 10 }: PhotoUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const remaining = maxPhotos - photos.length;
        const validFiles: File[] = [];

        for (let i = 0; i < fileList.length && validFiles.length < remaining; i++) {
            if (ACCEPTED_TYPES.includes(fileList[i].type)) {
                validFiles.push(fileList[i]);
            }
        }

        if (validFiles.length > 0) {
            onAdd(validFiles);
        }

        // Reset input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const missing = Math.max(0, 3 - photos.length);
    const canAdd = photos.length < maxPhotos;

    return (
        <div>
            {/* Upload area */}
            {canAdd && (
                <button
                    type="button"
                    onClick={handleClick}
                    className="w-full min-h-[100px] rounded-[6px] border-2 border-dashed border-[#d1d5db] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 h-8 text-[#9ca3af]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <span className="text-body text-[#4b5563]">Subir foto</span>
                </button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Seleccionar fotos"
                tabIndex={-1}
            />

            {/* Photo thumbnails */}
            {photos.length > 0 && (
                <div
                    className="flex gap-[8px] mt-[12px] overflow-x-auto pb-[4px]"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {photos.map((photo, index) => (
                        <PhotoThumbnail
                            key={photo.previewUrl}
                            src={photo.previewUrl}
                            onRemove={() => onRemove(index)}
                        />
                    ))}
                </div>
            )}

            {/* Counter */}
            <div className="flex justify-between mt-[8px]">
                <span className="text-caption text-[#4b5563]">
                    {photos.length} de {maxPhotos} fotos
                </span>
                {missing > 0 && (
                    <span className="text-caption text-[#4b5563]">
                        Faltan {missing} fotos
                    </span>
                )}
            </div>
        </div>
    );
}
