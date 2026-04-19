'use client';

import type { ContractFormData } from '../types';

interface StepTermsProps {
    data: ContractFormData;
    errors: Record<string, string>;
    onChange: (field: string, value: string) => void;
}

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

export function StepTerms({ data, errors, onChange }: StepTermsProps) {
    const fieldBorderClass = (field: string) =>
        errors[field]
            ? 'border-red-600 focus:ring-red-600'
            : 'border-gray-300 focus:ring-primary';

    const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const stripped = stripCOP(e.target.value);
        onChange('monthlyRent', stripped);
    };

    return (
        <div className="flex flex-col gap-5">
            <h2 className="text-h3 font-semibold text-[#111827]">Términos del contrato</h2>

            {/* Fecha de inicio */}
            <div>
                <label htmlFor="startDate" className="block text-caption font-medium text-gray-700 mb-1">
                    Fecha de inicio
                </label>
                <input
                    id="startDate"
                    type="date"
                    value={data.startDate}
                    onChange={(e) => onChange('startDate', e.target.value)}
                    aria-describedby={errors.startDate ? 'startDate-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('startDate')}`}
                />
                {errors.startDate && (
                    <p id="startDate-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.startDate}
                    </p>
                )}
            </div>

            {/* Fecha de fin (opcional) */}
            <div>
                <label htmlFor="endDate" className="block text-caption font-medium text-gray-700 mb-1">
                    Fecha de fin (opcional)
                </label>
                <input
                    id="endDate"
                    type="date"
                    value={data.endDate}
                    onChange={(e) => onChange('endDate', e.target.value)}
                    aria-describedby={errors.endDate ? 'endDate-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('endDate')}`}
                />
                {errors.endDate && (
                    <p id="endDate-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.endDate}
                    </p>
                )}
            </div>

            {/* Canon mensual */}
            <div>
                <label htmlFor="monthlyRent" className="block text-caption font-medium text-gray-700 mb-1">
                    Canon mensual
                </label>
                <input
                    id="monthlyRent"
                    type="text"
                    inputMode="numeric"
                    value={formatCOP(data.monthlyRent)}
                    onChange={handleRentChange}
                    placeholder="$0"
                    aria-describedby={errors.monthlyRent ? 'monthlyRent-error' : undefined}
                    className={`w-full h-[48px] min-h-[44px] rounded-[10px] border px-3 text-body focus:outline-none focus:ring-2 transition-colors ${fieldBorderClass('monthlyRent')}`}
                />
                {errors.monthlyRent && (
                    <p id="monthlyRent-error" aria-live="polite" className="mt-1 text-small text-red-600">
                        {errors.monthlyRent}
                    </p>
                )}
            </div>
        </div>
    );
}
