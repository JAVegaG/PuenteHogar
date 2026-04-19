'use client';

import type { ContractFormData } from '../types';

interface StepTenantProps {
    data: ContractFormData;
    errors: Record<string, string>;
    onChange: (field: string, value: string) => void;
}

const DOCUMENT_TYPES = [
    { code: 'CC', label: 'Cédula de Ciudadanía' },
    { code: 'NIT', label: 'NIT' },
    { code: 'CE', label: 'Cédula de Extranjería' },
    { code: 'PP', label: 'Pasaporte' },
    { code: 'TI', label: 'Tarjeta de Identidad' },
];

export function StepTenant({ data, errors, onChange }: StepTenantProps) {
    const fieldBorderClass = (field: string) =>
        errors[field]
            ? 'border-red-600 focus:ring-red-600'
            : 'border-gray-300 focus:ring-primary';

    return (
        <div className="flex flex-col gap-5">
            <h2 className="text-h3 font-semibold text-[#111827]">Datos del arrendatario</h2>

            {/* Notice box */}
            <div
                className="rounded-[6px] border p-4"
                style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
                role="note"
            >
                <p className="text-caption" style={{ color: '#92400E' }}>
                    <span className="font-semibold">Importante:</span> Esta plataforma no genera
                    contratos legalmente vinculantes. El contrato generado es un documento de
                    referencia. Consulte con un abogado para formalizar el acuerdo.
                </p>
            </div>

            {/* Nombre */}
            <div>
                <label htmlFor="firstName" className="block text-caption font-medium text-gray-700 mb-1">
                    Nombre
                </label>
                <input
                    id="firstName"
                    type="text"
                    value={data.firstName}
                    onChange={(e) => onChange('firstName', e.target.value)}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('firstName')}`}
                />
                {errors.firstName && (
                    <p id="firstName-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.firstName}
                    </p>
                )}
            </div>

            {/* Apellido */}
            <div>
                <label htmlFor="lastName" className="block text-caption font-medium text-gray-700 mb-1">
                    Apellido
                </label>
                <input
                    id="lastName"
                    type="text"
                    value={data.lastName}
                    onChange={(e) => onChange('lastName', e.target.value)}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('lastName')}`}
                />
                {errors.lastName && (
                    <p id="lastName-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.lastName}
                    </p>
                )}
            </div>

            {/* Tipo de documento */}
            <div>
                <label htmlFor="documentTypeCode" className="block text-caption font-medium text-gray-700 mb-1">
                    Tipo de documento
                </label>
                <select
                    id="documentTypeCode"
                    value={data.documentTypeCode}
                    onChange={(e) => onChange('documentTypeCode', e.target.value)}
                    aria-describedby={errors.documentTypeCode ? 'documentTypeCode-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors bg-white ${fieldBorderClass('documentTypeCode')}`}
                >
                    <option value="">Seleccionar tipo</option>
                    {DOCUMENT_TYPES.map((dt) => (
                        <option key={dt.code} value={dt.code}>
                            {dt.label}
                        </option>
                    ))}
                </select>
                {errors.documentTypeCode && (
                    <p id="documentTypeCode-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.documentTypeCode}
                    </p>
                )}
            </div>

            {/* Número de documento */}
            <div>
                <label htmlFor="documentNumber" className="block text-caption font-medium text-gray-700 mb-1">
                    Número de documento
                </label>
                <input
                    id="documentNumber"
                    type="text"
                    value={data.documentNumber}
                    onChange={(e) => onChange('documentNumber', e.target.value)}
                    aria-describedby={errors.documentNumber ? 'documentNumber-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('documentNumber')}`}
                />
                {errors.documentNumber && (
                    <p id="documentNumber-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.documentNumber}
                    </p>
                )}
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className="block text-caption font-medium text-gray-700 mb-1">
                    Correo electrónico
                </label>
                <input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('email')}`}
                />
                {errors.email && (
                    <p id="email-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.email}
                    </p>
                )}
            </div>

            {/* Teléfono */}
            <div>
                <label htmlFor="phoneNumber" className="block text-caption font-medium text-gray-700 mb-1">
                    Teléfono
                </label>
                <input
                    id="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    value={data.phoneNumber}
                    onChange={(e) => onChange('phoneNumber', e.target.value)}
                    aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('phoneNumber')}`}
                />
                {errors.phoneNumber && (
                    <p id="phoneNumber-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.phoneNumber}
                    </p>
                )}
            </div>
        </div>
    );
}
