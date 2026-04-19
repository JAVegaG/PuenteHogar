import { formatPrice } from '@/shared/utils/formatPrice';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { PropertyDetailRow } from '../types';

interface PropertyDetailTableProps {
    units: PropertyDetailRow[];
}

export function PropertyDetailTable({ units }: PropertyDetailTableProps) {
    if (units.length === 0) {
        return (
            <p className="text-caption py-[16px] text-center" style={{ color: '#4b5563' }}>
                No se encontraron propiedades para el periodo seleccionado.
            </p>
        );
    }

    return (
        <>
            {/* Desktop table — hidden on mobile, shown from md */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr
                            className="text-caption font-medium text-left"
                            style={{ color: '#4b5563', borderBottom: '1px solid #d1d5db' }}
                        >
                            <th className="pb-[8px] pr-[12px] font-medium">Dirección</th>
                            <th className="pb-[8px] pr-[12px] font-medium">Barrio</th>
                            <th className="pb-[8px] pr-[12px] font-medium text-right">Ingreso mensual</th>
                            <th className="pb-[8px] font-medium">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {units.map((unit) => (
                            <tr
                                key={unit.unitId}
                                className="text-body"
                                style={{ borderBottom: '1px solid #e5e7eb' }}
                            >
                                <td className="py-[12px] pr-[12px]" style={{ color: '#111827' }}>
                                    {unit.address}
                                </td>
                                <td className="py-[12px] pr-[12px] text-caption" style={{ color: '#4b5563' }}>
                                    {unit.neighborhood}
                                </td>
                                <td
                                    className="py-[12px] pr-[12px] text-body font-semibold text-right"
                                    style={{ color: '#111827' }}
                                >
                                    {formatPrice(unit.monthlyIncome)}
                                </td>
                                <td className="py-[12px]">
                                    <StatusBadge status={unit.paymentStatus} variant="payment" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile stacked cards — shown on mobile, hidden from md */}
            <div className="flex flex-col gap-[12px] md:hidden">
                {units.map((unit) => (
                    <div
                        key={unit.unitId}
                        className="rounded-[6px] p-[16px]"
                        style={{ border: '1px solid #d1d5db' }}
                    >
                        <p className="text-body font-semibold" style={{ color: '#111827' }}>
                            {unit.address}
                        </p>
                        <p className="text-caption mt-[4px]" style={{ color: '#4b5563' }}>
                            {unit.neighborhood}
                        </p>
                        <div className="flex items-center justify-between mt-[8px]">
                            <p className="text-body font-semibold" style={{ color: '#111827' }}>
                                {formatPrice(unit.monthlyIncome)}
                            </p>
                            <StatusBadge status={unit.paymentStatus} variant="payment" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
