'use client';

import { useRef } from 'react';
import type { ContractFormData } from '../types';

interface StepDocumentProps {
    data: ContractFormData;
    errors: Record<string, string>;
    onFileSelect: (file: File) => void;
}

export function StepDocument({ data, errors, onFileSelect }: StepDocumentProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <h2 className="text-h3 font-semibold text-[#111827]">Documento del contrato</h2>

            <p className="text-caption text-[#4b5563]">
                Sube el documento PDF del contrato de arrendamiento. Solo se aceptan archivos en formato PDF.
            </p>

            {/* Upload area */}
            <div>
                <button
                    type="button"
                    onClick={handleClick}
                    aria-describedby={errors.file ? 'file-error' : undefined}
                    className={`w-full min-h-[120px] rounded-[6px] border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${errors.file ? 'border-red-600' : 'border-[#d1d5db]'
                        }`}
                >
                    {/* Upload icon */}
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
                    <span className="text-body text-[#4b5563]">
                        {data.file ? data.file.name : 'Seleccionar archivo PDF'}
                    </span>
                    {data.file && (
                        <span className="text-small text-[#6b7280]">
                            {(data.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                    )}
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                    aria-label="Seleccionar archivo PDF"
                    tabIndex={-1}
                />

                {errors.file && (
                    <p id="file-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.file}
                    </p>
                )}
            </div>
        </div>
    );
}
