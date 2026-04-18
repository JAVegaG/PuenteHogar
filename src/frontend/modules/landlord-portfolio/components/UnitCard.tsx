import Link from 'next/link';
import { formatPrice } from '@/shared/utils/formatPrice';
import { formatPortfolioDate } from '../utils';
import type { PortfolioUnit } from '../types';

interface UnitCardProps {
  unit: PortfolioUnit;
}

export default function UnitCard({ unit }: UnitCardProps) {
  const hasConditions = unit.conditions !== null && unit.conditions.trim() !== '';
  const formattedPrice = formatPrice(unit.leaseBaseAmount);
  const conditionsText = hasConditions ? unit.conditions : 'Sin condiciones especiales';

  return (
    <Link
      href={`/mi-portafolio/${unit.id}`}
      className="block min-h-[44px]"
      aria-label={`Unidad con canon base $${formattedPrice} ${unit.leaseBaseCurrency} por mes. ${conditionsText}`}
    >
      <article className="border border-[#d1d5db] rounded-[6px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] bg-white p-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-[20px] font-semibold text-[#1d4ed8]">
            ${formattedPrice}
          </h3>
          <span className="text-[14px] text-[#4b5563]">/mes</span>
          <span className="bg-[#f3f4f6] rounded-[4px] px-2 py-0.5 text-[14px] text-[#4b5563]">
            {unit.leaseBaseCurrency}
          </span>
        </div>

        {hasConditions ? (
          <p className="text-[16px] text-[#4b5563] mt-2">
            {unit.conditions}
          </p>
        ) : (
          <p className="text-[14px] text-[#4b5563] mt-2">
            Sin condiciones especiales
          </p>
        )}

        <p className="text-[14px] text-[#4b5563] mt-2">
          {formatPortfolioDate(unit.createdAt)}
        </p>
      </article>
    </Link>
  );
}
