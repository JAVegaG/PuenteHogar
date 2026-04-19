import { UnitInfo } from '../types';

interface UnitInfoHeaderProps {
    unit: UnitInfo;
}

export function UnitInfoHeader({ unit }: UnitInfoHeaderProps) {
    return (
        <div>
            <h2 className="text-h3 font-semibold" style={{ color: '#111827' }}>
                {unit.name}
            </h2>
            <p className="text-caption mt-[2px]" style={{ color: '#4b5563' }}>
                {unit.propertyType}
            </p>
            <p className="text-caption mt-[2px]" style={{ color: '#4b5563' }}>
                {unit.address}
            </p>
            <div className="flex flex-wrap gap-[8px] mt-[8px]">
                <span
                    className="text-caption px-[8px] py-[2px] rounded-[4px]"
                    style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                >
                    {unit.numberOfRooms} hab.
                </span>
                <span
                    className="text-caption px-[8px] py-[2px] rounded-[4px]"
                    style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                >
                    {unit.numberOfBathrooms} baños
                </span>
                {unit.area !== null && (
                    <span
                        className="text-caption px-[8px] py-[2px] rounded-[4px]"
                        style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }}
                    >
                        {unit.area} m²
                    </span>
                )}
            </div>
        </div>
    );
}
