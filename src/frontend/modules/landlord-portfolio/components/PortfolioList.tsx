import UnitCard from './UnitCard';
import type { PortfolioUnit } from '../types';

interface PortfolioListProps {
  units: PortfolioUnit[];
}

export default function PortfolioList({ units }: PortfolioListProps) {
  return (
    <section aria-label="Listado de unidades de portafolio" className="flex flex-col gap-4">
      {units.map((unit) => (
        <UnitCard key={unit.id} unit={unit} />
      ))}
    </section>
  );
}
